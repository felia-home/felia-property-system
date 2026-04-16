import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "住所が必要です" }, { status: 400 });
  }

  try {
    const query = address.includes("日本") ? address : `日本 ${address}`;
    const encoded = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=3&accept-language=ja&countrycodes=jp`;

    console.log("[Geocode] Requesting:", url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "felia-home-admin/1.0 (contact@felia-home.co.jp)",
      },
      signal: AbortSignal.timeout(10000),
    });

    console.log("[Geocode] Status:", res.status);

    if (!res.ok) {
      console.error("[Geocode] API error:", res.status, res.statusText);
      return NextResponse.json({ error: "ジオコーディングAPIエラー" }, { status: 502 });
    }

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    console.log("[Geocode] Results count:", data?.length ?? 0);
    if (data?.[0]) {
      console.log("[Geocode] First result:", data[0].display_name, data[0].lat, data[0].lon);
    }

    if (!data || data.length === 0) {
      // フォールバック：番地以降を除いた区・市レベルで再検索
      const simplified = address
        .replace(/[0-9０-９]/g, "")
        .replace(/[-－ー]/g, "")
        .split(/[丁目番地号]/)[0]
        .trim();

      console.log("[Geocode] Fallback search:", simplified);

      const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent("日本 " + simplified)}&format=json&limit=1&accept-language=ja&countrycodes=jp`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "felia-home-admin/1.0 (contact@felia-home.co.jp)",
        },
        signal: AbortSignal.timeout(10000),
      });
      const fallbackData = await fallbackRes.json() as Array<{ lat: string; lon: string; display_name: string }>;
      console.log("[Geocode] Fallback results:", fallbackData?.length ?? 0);

      if (!fallbackData || fallbackData.length === 0) {
        return NextResponse.json({ lat: null, lng: null });
      }

      return NextResponse.json({
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon),
        display_name: fallbackData[0].display_name,
        note: "フォールバック検索結果（番地以降を省略）",
      });
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch (error) {
    console.error("[Geocode] Error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。しばらくしてから再試行してください。" },
      { status: 500 }
    );
  }
}
