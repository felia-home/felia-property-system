import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 種別×区の件数を集計
  const stats = await prisma.$queryRaw<{
    source_type: string;
    area: string;
    cnt: bigint;
  }[]>`
    SELECT source_type, area, COUNT(*) as cnt
    FROM reins_properties
    WHERE is_active = true AND area IS NOT NULL
    GROUP BY source_type, area
    ORDER BY source_type, cnt DESC
  `;

  // 整形
  const byType: Record<string, { area: string; count: number }[]> = {
    MANSION: [],
    HOUSE:   [],
    LAND:    [],
  };

  for (const row of stats) {
    const type = row.source_type;
    if (byType[type]) {
      byType[type].push({ area: row.area, count: Number(row.cnt) });
    }
  }

  // 合計
  const totals = {
    MANSION: byType.MANSION.reduce((s, r) => s + r.count, 0),
    HOUSE:   byType.HOUSE.reduce((s, r)   => s + r.count, 0),
    LAND:    byType.LAND.reduce((s, r)    => s + r.count, 0),
    total:   0,
  };
  totals.total = totals.MANSION + totals.HOUSE + totals.LAND;

  return NextResponse.json({ byType, totals });
}
