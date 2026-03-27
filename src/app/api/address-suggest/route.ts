import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/address-suggest?postal=1500033
 * Proxy for zipcloud postal code API (CORS-safe server-side call)
 * Returns: { prefecture, city, town } or null
 *
 * GET /api/address-suggest?city=渋谷区&town=代
 * Returns town name suggestions via Nominatim
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postal = searchParams.get("postal");
  const city = searchParams.get("city");
  const town = searchParams.get("town");

  // ── 郵便番号 → 住所 ──────────────────────────────────────────────────────
  if (postal) {
    const code = postal.replace(/-/g, "");
    if (code.length !== 7) {
      return NextResponse.json({ result: null });
    }
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`,
        { next: { revalidate: 86400 } } // cache 24h
      );
      const data = await res.json() as {
        status: number;
        results: Array<{ address1: string; address2: string; address3: string }> | null;
      };
      if (data.status === 200 && data.results?.[0]) {
        const r = data.results[0];
        return NextResponse.json({
          result: {
            prefecture: r.address1,
            city: r.address2,
            town: r.address3,
          },
        });
      }
    } catch { /* fall through */ }
    return NextResponse.json({ result: null });
  }

  // ── 町名サジェスト (Nominatim) ─────────────────────────────────────────
  if (city && town && town.length >= 1) {
    try {
      const q = encodeURIComponent(`${town} ${city} 東京都`);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=8&addressdetails=1&countrycodes=jp`;
      const res = await fetch(url, {
        headers: { "User-Agent": "felia-property-system/1.0" },
        next: { revalidate: 3600 },
      });
      const data = await res.json() as Array<{
        display_name: string;
        address?: { suburb?: string; neighbourhood?: string; quarter?: string; hamlet?: string };
      }>;

      const towns = Array.from(
        new Set(
          data
            .map((d) => d.address?.suburb ?? d.address?.neighbourhood ?? d.address?.quarter ?? d.address?.hamlet)
            .filter((t): t is string => !!t && t.includes(town))
        )
      ).slice(0, 6);

      return NextResponse.json({ towns });
    } catch { /* fall through */ }
    return NextResponse.json({ towns: [] });
  }

  return NextResponse.json({ result: null, towns: [] });
}
