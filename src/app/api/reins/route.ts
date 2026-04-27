import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// BigInt は JSON にそのままシリアライズできないため変換
const serialize = <T>(data: T): T =>
  JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q           = searchParams.get("q") ?? "";
  const source_type = searchParams.get("source_type") ?? "";
  const area        = searchParams.get("area") ?? "";
  const price_min   = searchParams.get("price_min") ? Number(searchParams.get("price_min")) : null;
  const price_max   = searchParams.get("price_max") ? Number(searchParams.get("price_max")) : null;
  const page        = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit       = Math.min(100, Number(searchParams.get("limit") ?? "50"));

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
      { area:          { contains: q } },
    ];
  }

  const [total, properties] = await Promise.all([
    prisma.reinsProperty.count({ where }),
    prisma.reinsProperty.findMany({
      where,
      orderBy: { imported_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
