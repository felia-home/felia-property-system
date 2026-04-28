import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: 種別別の重複検出（ドライラン）
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // マンション重複
  const mansionDups = await prisma.$queryRaw<{
    address: string;
    building_name: string | null;
    floor: number | null;
    area_m2: number | null;
    cnt: bigint;
  }[]>`
    SELECT address, building_name, floor, area_m2, COUNT(*) as cnt
    FROM reins_properties
    WHERE is_active = true AND source_type = 'MANSION'
      AND address IS NOT NULL
    GROUP BY address, building_name, floor, area_m2
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `;

  // 戸建て重複
  const houseDups = await prisma.$queryRaw<{
    address: string;
    area_build_m2: number | null;
    area_land_m2: number | null;
    cnt: bigint;
  }[]>`
    SELECT address, area_build_m2, area_land_m2, COUNT(*) as cnt
    FROM reins_properties
    WHERE is_active = true AND source_type = 'HOUSE'
      AND address IS NOT NULL
    GROUP BY address, area_build_m2, area_land_m2
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `;

  // 土地重複
  const landDups = await prisma.$queryRaw<{
    address: string;
    area_m2: number | null;
    cnt: bigint;
  }[]>`
    SELECT address, area_m2, COUNT(*) as cnt
    FROM reins_properties
    WHERE is_active = true AND source_type = 'LAND'
      AND address IS NOT NULL
    GROUP BY address, area_m2
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `;

  const allDups = [
    ...mansionDups.map(d => ({
      source_type:   "MANSION",
      address:       d.address,
      building_name: d.building_name,
      floor:         d.floor != null ? Number(d.floor) : null,
      area_m2:       d.area_m2 != null ? Number(d.area_m2) : null,
      count:         Number(d.cnt),
    })),
    ...houseDups.map(d => ({
      source_type:   "HOUSE",
      address:       d.address,
      area_build_m2: d.area_build_m2 != null ? Number(d.area_build_m2) : null,
      area_land_m2:  d.area_land_m2 != null ? Number(d.area_land_m2) : null,
      count:         Number(d.cnt),
    })),
    ...landDups.map(d => ({
      source_type: "LAND",
      address:     d.address,
      area_m2:     d.area_m2 != null ? Number(d.area_m2) : null,
      count:       Number(d.cnt),
    })),
  ].sort((a, b) => b.count - a.count);

  const totalToRemove = allDups.reduce((sum, d) => sum + d.count - 1, 0);

  return NextResponse.json({
    duplicate_groups: allDups.length,
    total_to_remove:  totalToRemove,
    samples:          allDups.slice(0, 30),
  });
}

// POST: 種別ごとに重複を非アクティブ化（最古の1件を残す）
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let deactivated = 0;

    // ===== マンション =====
    const mansionDups = await prisma.$queryRaw<{
      address: string;
      building_name: string | null;
      floor: number | null;
      area_m2: number | null;
    }[]>`
      SELECT address, building_name, floor, area_m2
      FROM reins_properties
      WHERE is_active = true AND source_type = 'MANSION' AND address IS NOT NULL
      GROUP BY address, building_name, floor, area_m2
      HAVING COUNT(*) > 1
    `;

    for (const dup of mansionDups) {
      const items = await prisma.reinsProperty.findMany({
        where: {
          source_type:   "MANSION",
          address:       dup.address,
          building_name: dup.building_name,
          floor:         dup.floor != null ? Number(dup.floor) : null,
          area_m2:       dup.area_m2 != null ? Number(dup.area_m2) : null,
          is_active:     true,
        },
        orderBy: { imported_at: "asc" },
        select: { id: true },
      });
      if (items.length <= 1) continue;
      await prisma.reinsProperty.updateMany({
        where: { id: { in: items.slice(1).map(i => i.id) } },
        data:  { is_active: false },
      });
      deactivated += items.length - 1;
    }

    // ===== 戸建て =====
    const houseDups = await prisma.$queryRaw<{
      address: string;
      area_build_m2: number | null;
      area_land_m2: number | null;
    }[]>`
      SELECT address, area_build_m2, area_land_m2
      FROM reins_properties
      WHERE is_active = true AND source_type = 'HOUSE' AND address IS NOT NULL
      GROUP BY address, area_build_m2, area_land_m2
      HAVING COUNT(*) > 1
    `;

    for (const dup of houseDups) {
      const items = await prisma.reinsProperty.findMany({
        where: {
          source_type:   "HOUSE",
          address:       dup.address,
          area_build_m2: dup.area_build_m2 != null ? Number(dup.area_build_m2) : null,
          area_land_m2:  dup.area_land_m2  != null ? Number(dup.area_land_m2)  : null,
          is_active:     true,
        },
        orderBy: { imported_at: "asc" },
        select: { id: true },
      });
      if (items.length <= 1) continue;
      await prisma.reinsProperty.updateMany({
        where: { id: { in: items.slice(1).map(i => i.id) } },
        data:  { is_active: false },
      });
      deactivated += items.length - 1;
    }

    // ===== 土地 =====
    const landDups = await prisma.$queryRaw<{
      address: string;
      area_m2: number | null;
    }[]>`
      SELECT address, area_m2
      FROM reins_properties
      WHERE is_active = true AND source_type = 'LAND' AND address IS NOT NULL
      GROUP BY address, area_m2
      HAVING COUNT(*) > 1
    `;

    for (const dup of landDups) {
      const items = await prisma.reinsProperty.findMany({
        where: {
          source_type: "LAND",
          address:     dup.address,
          area_m2:     dup.area_m2 != null ? Number(dup.area_m2) : null,
          is_active:   true,
        },
        orderBy: { imported_at: "asc" },
        select: { id: true },
      });
      if (items.length <= 1) continue;
      await prisma.reinsProperty.updateMany({
        where: { id: { in: items.slice(1).map(i => i.id) } },
        data:  { is_active: false },
      });
      deactivated += items.length - 1;
    }

    const activeCount = await prisma.reinsProperty.count({
      where: { is_active: true },
    });

    return NextResponse.json({
      ok:           true,
      deactivated,
      active_count: activeCount,
    });
  } catch (error) {
    console.error("dedup error:", error);
    return NextResponse.json({ error: "重複処理に失敗しました" }, { status: 500 });
  }
}
