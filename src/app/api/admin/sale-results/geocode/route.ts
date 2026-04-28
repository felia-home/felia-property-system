import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/admin/sale-results/geocode
// 緯度経度未設定の売却実績を国土地理院 AddressSearch API で一括ジオコーディング
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await prisma.saleResult.findMany({
    where: {
      is_active: true,
      OR: [
        { latitude:  null },
        { longitude: null },
      ],
    },
    select: { id: true, area: true, area_ward: true, area_town: true },
  });

  let success = 0;
  let failed  = 0;

  for (const r of results) {
    const ward    = r.area_ward ?? r.area;
    const address = [ward, r.area_town].filter(Boolean).join("");
    if (!address) { failed++; continue; }

    try {
      const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent("東京都" + address)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json() as { geometry?: { coordinates?: [number, number] } }[];

      if (Array.isArray(data) && data.length > 0 && data[0]?.geometry?.coordinates) {
        const [lng, lat] = data[0].geometry.coordinates;
        await prisma.saleResult.update({
          where: { id: r.id },
          data:  { latitude: lat, longitude: lng },
        });
        success++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return NextResponse.json({ success, failed, total: results.length });
}
