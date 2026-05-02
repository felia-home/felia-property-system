import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: {
      desired_budget_min:    true,
      desired_budget_max:    true,
      desired_areas:         true,
      desired_stations:      true,
      desired_property_type: true,
      desired_area_min:      true,
      desired_area_max:      true,
      desired_rooms:         true,
      desired_building_year: true,
      desired_walk_max:      true,
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 価格範囲は1つのprice filterに集約（複数指定時の上書き回避）
  const priceFilter: Prisma.IntFilter | undefined =
    customer.desired_budget_min || customer.desired_budget_max
      ? {
          ...(customer.desired_budget_min ? { gte: customer.desired_budget_min } : {}),
          ...(customer.desired_budget_max ? { lte: customer.desired_budget_max } : {}),
        }
      : undefined;

  const where: Prisma.PropertyWhereInput = {
    published_hp: true,
    is_deleted:   false,
    ...(priceFilter ? { price: priceFilter } : {}),
    ...(customer.desired_areas.length > 0 ? {
      city: { in: customer.desired_areas },
    } : {}),
    ...(customer.desired_property_type.length > 0 ? {
      property_type: { in: customer.desired_property_type },
    } : {}),
    ...(customer.desired_walk_max ? {
      station_walk1: { lte: customer.desired_walk_max },
    } : {}),
  };

  const properties = await prisma.property.findMany({
    where,
    take: 20,
    orderBy: { created_at: "desc" },
    select: {
      id:                true,
      property_type:     true,
      price:             true,
      city:              true,
      town:              true,
      rooms:             true,
      area_build_m2:     true,
      area_exclusive_m2: true,
      station_line1:     true,
      station_name1:     true,
      station_walk1:     true,
      building_year:     true,
      building_name:     true,
      images: {
        take: 1,
        orderBy: { order: "asc" },
        select: { url: true },
      },
    },
  });

  // スコアリング（マッチ度計算）
  const scored = properties.map(p => {
    let score = 0;
    if (customer.desired_budget_max && p.price && p.price <= customer.desired_budget_max) score += 30;
    if (p.city && customer.desired_areas.includes(p.city))                                  score += 25;
    if (customer.desired_property_type.includes(p.property_type))                           score += 20;
    if (customer.desired_walk_max && p.station_walk1 && p.station_walk1 <= customer.desired_walk_max) score += 15;
    if (customer.desired_rooms.some(r => p.rooms?.includes(r)))                             score += 10;
    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ properties: scored, total: scored.length });
}
