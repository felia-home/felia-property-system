import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// BigInt は JSON にそのままシリアライズできないため変換
const serialize = <T>(data: T): T =>
  JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 会員IDで認証チェック
  const member_id = searchParams.get("member_id");
  if (!member_id) {
    return NextResponse.json({ error: "会員登録が必要です" }, { status: 401 });
  }

  // 会員の存在確認（is_active = true のみ許可）
  const member = await prisma.member.findFirst({
    where: { id: member_id, is_active: true },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 401 });
  }

  const q           = searchParams.get("q") ?? "";
  const source_type = searchParams.get("source_type") ?? "";
  const area        = searchParams.get("area") ?? "";
  const price_min   = searchParams.get("price_min") ? Number(searchParams.get("price_min")) : null;
  const price_max   = searchParams.get("price_max") ? Number(searchParams.get("price_max")) : null;
  const page        = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit       = Math.min(50, Number(searchParams.get("limit") ?? "20"));

  const where: Record<string, unknown> = { is_active: true };
  if (source_type) where["source_type"] = source_type;
  if (area)        where["area"] = area;
  if (price_min !== null || price_max !== null) {
    where["price"] = {
      ...(price_min !== null ? { gte: price_min } : {}),
      ...(price_max !== null ? { lte: price_max } : {}),
    };
  }
  if (q) {
    where["OR"] = [
      { address:       { contains: q } },
      { building_name: { contains: q } },
      { station_name:  { contains: q } },
    ];
  }

  const [total, properties] = await Promise.all([
    prisma.reinsProperty.count({ where }),
    prisma.reinsProperty.findMany({
      where,
      orderBy: { imported_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, source_type: true, property_type: true,
        price: true, address: true, area: true, town: true,
        area_m2: true, area_build_m2: true, area_land_m2: true,
        rooms: true, building_name: true, floor: true,
        management_fee: true, station_line: true, station_name: true,
        walk_minutes: true, built_year: true, built_year_text: true,
        use_zone: true, building_coverage: true, floor_area_ratio: true,
        transaction_type: true,
      },
    }),
  ]);

  return NextResponse.json(serialize({
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    properties,
  }));
}
