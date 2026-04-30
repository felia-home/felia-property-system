import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// BigInt を JSON シリアライズ可能に
const serialize = <T>(data: T): T =>
  JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

// GET /api/hp/reins/[id]?member_id=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const member_id = searchParams.get("member_id");

  if (!member_id) {
    return NextResponse.json({ error: "会員登録が必要です" }, { status: 401 });
  }

  // 会員の存在確認
  const member = await prisma.member.findFirst({
    where: { id: member_id, is_active: true },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 401 });
  }

  const property = await prisma.reinsProperty.findFirst({
    where: { id: params.id, is_active: true },
    select: {
      id: true,
      source_type: true,
      property_type: true,
      price: true,
      address: true,
      area: true,
      town: true,
      area_m2: true,
      area_build_m2: true,
      area_land_m2: true,
      use_zone: true,
      rooms: true,
      building_name: true,
      floor: true,
      management_fee: true,
      transaction_type: true,
      station_line: true,
      station_name: true,
      walk_minutes: true,
      built_year: true,
      built_year_text: true,
      building_coverage: true,
      floor_area_ratio: true,
      road_contact: true,
      direction: true,
      agent: true,
      imported_at: true,
    },
  });

  if (!property) {
    return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(serialize({ property }));
}
