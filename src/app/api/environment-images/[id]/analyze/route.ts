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
// 画像を Claude で解析し、facility_name / facility_type / city を更新
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

  try {
    const imgRes = await fetch(image.url);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "画像の取得に失敗しました" }, { status: 400 });
    }
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = Buffer.from(imgBuffer).toString("base64");
    const mediaType = normalizeMediaType(imgRes.headers.get("content-type"));

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type:       "base64",
                media_type: mediaType,
                data:       imgBase64,
              },
            },
            {
              type: "text",
              text: `この写真を分析して、以下の情報をJSONで返してください。

{
  "facility_name": "施設名（例: セブンイレブン四谷店、新宿区立四谷小学校、四ツ谷駅）",
  "facility_type": "施設種別（SUPERMARKET/SCHOOL/PARK/HOSPITAL/STATION/CONVENIENCE/BANK/LIBRARY/OTHER のいずれか）",
  "area": "エリア（区名 例: 新宿区、中野区）※写真から読み取れる場合のみ",
  "description": "施設の簡単な説明（20文字以内）"
}

施設名が読み取れない場合は「不明」ではなく施設の種類を記載してください。
例: 「近隣スーパー」「近隣公園」「最寄り駅」など。
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

    let analyzed: {
      facility_name?: string;
      facility_type?: string;
      area?: string;
      description?: string;
    } = {};

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) analyzed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("analyze JSON parse error:", e, "text:", text);
      analyzed = {};
    }

    // PropertyEnvironmentImage には area カラムが無いため city にマップ
    const data: Record<string, unknown> = {};
    if (analyzed.facility_name) data.facility_name = analyzed.facility_name;
    if (analyzed.facility_type) data.facility_type = analyzed.facility_type;
    if (analyzed.area)          data.city          = analyzed.area;
    if (analyzed.description)   data.ai_caption    = analyzed.description;

    const updated = Object.keys(data).length > 0
      ? await prisma.propertyEnvironmentImage.update({
          where: { id: params.id },
          data,
        })
      : image;

    return NextResponse.json({ ok: true, analyzed, image: updated });
  } catch (error) {
    console.error("analyze error:", error);
    return NextResponse.json({ error: "AI解析に失敗しました" }, { status: 500 });
  }
}
