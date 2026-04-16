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
    // 国土地理院 住所検索API（無料・APIキー不要・日本の住所に最適）
    const encoded = encodeURIComponent(address);
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encoded}`;

    console.log("[Geocode] GSI Request:", url);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("[Geocode] GSI API error:", res.status);
      return NextResponse.json({ lat: null, lng: null });
    }

    const data = await res.json() as Array<{
      geometry: { coordinates: [number, number] };
      properties?: { title?: string };
    }>;
    console.log("[Geocode] GSI Results:", JSON.stringify(data).slice(0, 200));

    // 国土地理院APIのレスポンス形式：
    // [{ geometry: { coordinates: [lng, lat] }, properties: { title: "..." } }]
    if (!data || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const [lng, lat] = data[0].geometry.coordinates;

    return NextResponse.json({
      lat,
      lng,
      display_name: data[0].properties?.title ?? address,
    });
  } catch (error) {
    console.error("[Geocode] Error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
