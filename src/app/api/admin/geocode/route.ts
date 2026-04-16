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
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&accept-language=ja`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "felia-home-admin/1.0 (contact@felia-home.co.jp)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ジオコーディングAPIエラー" }, { status: 502 });
    }

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;

    if (!data || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null });
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
