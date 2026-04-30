import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/properties/nearby?lat=..&lng=..&exclude_id=..&city=..&limit=3
// HP公開中（published_hp=true）の近隣物件を返す簡易API
// 緯度経度が指定されている場合は同一区(city)を優先、なければ最新順
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit      = Math.min(10, Number(searchParams.get("limit") ?? "3"));
  const exclude_id = searchParams.get("exclude_id") ?? "";
  const city       = searchParams.get("city") ?? "";

  const where: Record<string, unknown> = {
    published_hp: true,
    is_deleted: false,
    ...(exclude_id ? { id: { not: exclude_id } } : {}),
    ...(city ? { city } : {}),
  };

  const properties = await prisma.property.findMany({
    where,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      property_type: true,
      price: true,
      city: true,
      town: true,
      rooms: true,
      area_build_m2: true,
      area_land_m2: true,
      area_exclusive_m2: true,
      station_line1: true,
      station_name1: true,
      station_walk1: true,
      building_year: true,
      images: {
        take: 1,
        orderBy: { order: "asc" },
        select: { url: true },
      },
    },
  });

  return NextResponse.json({ properties });
}
