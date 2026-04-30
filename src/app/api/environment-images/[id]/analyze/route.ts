import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function normalizeMediaType(s: string | null): ImageMediaType {
  const v = (s ?? "").toLowerCase();
  if (v.includes("png"))  return "image/png";
  if (v.includes("webp")) return "image/webp";
  if (v.includes("gif"))  return "image/gif";
  return "image/jpeg";
}

// POST /api/environment-images/[id]/analyze
//
// 動作:
// - 施設名が未設定 → AIで解析して入力
// - 施設名が既にある → AIで上書きしない（手動入力を尊重）
// - 緯度経度が未設定 → 施設名から国土地理院APIで自動取得
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const image = await prisma.propertyEnvironmentImage.findUnique({
    where: { id: params.id },
  });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  // 施設名が未設定の場合のみ AI で解析
  if (!image.facility_name) {
    try {
      const imgRes = await fetch(image.url);
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        const imgBase64 = Buffer.from(imgBuffer).toString("base64");
        const mediaType = normalizeMediaType(imgRes.headers.get("content-type"));

        const client = new Anthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: imgBase64 },
                },
                {
                  type: "text",
                  text: `この写真の施設名と種別をJSONで返してください。
{
  "facility_name": "施設名",
  "facility_type": "SUPERMARKET/SCHOOL/PARK/HOSPITAL/STATION/CONVENIENCE/BANK/LIBRARY/OTHER",
  "city": "区名（例: 新宿区）"
}
JSONのみ返してください。`,
                },
              ],
            },
          ],
        });

        const text = response.content
          .filter(b => b.type === "text")
          .map(b => (b as { type: "text"; text: string }).text)
          .join("");

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analyzed = JSON.parse(jsonMatch[0]) as {
            facility_name?: string;
            facility_type?: string;
            city?: string;
          };
          if (analyzed.facility_name) updateData.facility_name = analyzed.facility_name;
          if (analyzed.facility_type) updateData.facility_type = analyzed.facility_type;
          if (analyzed.city && !image.city) updateData.city = analyzed.city;
        }
      }
    } catch (e) {
      console.error("env-images analyze AI error:", e);
      // AI 解析失敗は無視
    }
  }

  // 緯度経度が未設定の場合は「区名+施設名」「施設名のみ」「東京都+施設名」の
  // 順で国土地理院 AddressSearch を試行
  if (image.latitude == null || image.longitude == null) {
    const nameForGeo = image.facility_name || (updateData.facility_name as string | undefined);
    const cityForGeo = image.city          || (updateData.city          as string | undefined);
    if (nameForGeo) {
      const candidates = [
        cityForGeo ? `${cityForGeo}${nameForGeo}` : null,
        nameForGeo,
        `東京都${nameForGeo}`,
      ].filter(Boolean) as string[];

      for (const term of candidates) {
        try {
          const geoUrl = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(term)}`;
          const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
          if (!geoRes.ok) continue;
          const geoData = await geoRes.json() as { geometry?: { coordinates?: [number, number] } }[];
          if (Array.isArray(geoData) && geoData.length > 0 && geoData[0]?.geometry?.coordinates) {
            const [lng, lat] = geoData[0].geometry.coordinates;
            updateData.latitude  = lat;
            updateData.longitude = lng;
            console.log(`[env-image analyze] geocoded "${term}" → ${lat},${lng}`);
            break;
          }
        } catch (e) {
          console.error(`[env-image analyze] geocode failed for "${term}":`, e);
          continue;
        }
      }
    }
  }

  let updated = image;
  if (Object.keys(updateData).length > 0) {
    updated = await prisma.propertyEnvironmentImage.update({
      where: { id: params.id },
      data:  updateData,
    });
  }

  return NextResponse.json({
    ok:        true,
    skipped:   Object.keys(updateData).length === 0,
    updated,
    image:     updated,
    analyzed: {
      facility_name: updateData.facility_name as string | undefined,
      facility_type: updateData.facility_type as string | undefined,
      city:          updateData.city as string | undefined,
      latitude:      updateData.latitude as number | undefined,
      longitude:     updateData.longitude as number | undefined,
    },
  });
}
