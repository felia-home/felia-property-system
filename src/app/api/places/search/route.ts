import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// GET /api/places/search?name=...&lat=..&lng=..&radius=1000
// Overpass API で物件周辺の施設候補を検索する
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name   = (searchParams.get("name") ?? "").trim();
  const latStr = searchParams.get("lat") ?? "";
  const lngStr = searchParams.get("lng") ?? "";
  const radius = Math.min(3000, Number(searchParams.get("radius") ?? "1000"));

  if (!name || !latStr || !lngStr) {
    return NextResponse.json({ error: "name, lat, lng が必要です" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat, lng が不正です" }, { status: 400 });
  }

  // Overpass の正規表現に渡す前に危険文字を除去
  const safeName = name.replace(/["\\]/g, "").slice(0, 80);

  const query = `[out:json][timeout:15];
(
  node["name"~"${safeName}"](around:${radius},${lat},${lng});
  way["name"~"${safeName}"](around:${radius},${lat},${lng});
);
out center 20;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "FeliaPropertySystem/1.0",
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn("Overpass error:", res.status, res.statusText);
      return NextResponse.json({ candidates: [] });
    }

    const data = await res.json() as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];

    const candidates = elements
      .filter(e => e.tags?.name)
      .map(e => {
        const tags = e.tags ?? {};
        const lat = e.type === "node" ? (e.lat ?? 0) : (e.center?.lat ?? 0);
        const lng = e.type === "node" ? (e.lon ?? 0) : (e.center?.lon ?? 0);
        return {
          name:     tags.name,
          category: tags.amenity || tags.shop || tags.leisure || tags.healthcare || tags.tourism || "",
          lat,
          lng,
        };
      })
      .filter(c => c.lat !== 0 && c.lng !== 0)
      .slice(0, 8);

    return NextResponse.json({ candidates });
  } catch (e) {
    console.error("places/search error:", e);
    return NextResponse.json({ candidates: [] });
  }
}
