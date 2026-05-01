import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/admin/mansions/link-properties
// マンション系物件で mansion_building_id 未設定のものを building_name で
// 建物マスタと一括紐付け
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await prisma.property.findMany({
    where: {
      property_type:       { in: ["MANSION", "NEW_MANSION"] },
      mansion_building_id: null,
      is_deleted:          false,
    },
    select: { id: true, building_name: true },
  });

  let linked  = 0;
  let skipped = 0;

  for (const prop of properties) {
    if (!prop.building_name) { skipped++; continue; }
    const trimmed = prop.building_name.replace(/[　\s]/g, "");

    // 完全一致 → 部分一致(先頭10文字)
    const match = await prisma.mansionBuilding.findFirst({
      where: { name: { contains: trimmed } },
      select: { id: true },
    }) ?? await prisma.mansionBuilding.findFirst({
      where: { name: { contains: prop.building_name.slice(0, 10) } },
      select: { id: true },
    });

    if (match) {
      await prisma.property.update({
        where: { id: prop.id },
        data:  { mansion_building_id: match.id },
      });
      linked++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, linked, skipped, total: properties.length });
}
