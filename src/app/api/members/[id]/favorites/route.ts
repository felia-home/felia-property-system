import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/members/[id]/favorites — 会員のお気に入り一覧
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const member = await prisma.member.findFirst({
    where: { id: params.id, is_active: true },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favorites = await prisma.memberFavorite.findMany({
    where: { member_id: params.id },
    orderBy: { created_at: "desc" },
    include: {
      property: {
        select: {
          id: true,
          property_type: true,
          price: true,
          city: true,
          town: true,
          address: true,
          rooms: true,
          area_build_m2: true,
          area_land_m2: true,
          area_exclusive_m2: true,
          station_line1: true,
          station_name1: true,
          station_walk1: true,
          building_year: true,
          published_hp: true,
          images: {
            take: 1,
            orderBy: { order: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    favorites: favorites.map(f => ({
      id:          f.id,
      property_id: f.property_id,
      created_at:  f.created_at,
      property:    f.property,
    })),
  });
}

// POST /api/members/[id]/favorites — お気に入り追加
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const member = await prisma.member.findFirst({
    where: { id: params.id, is_active: true },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { propertyId } = await req.json() as { propertyId?: string };
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }

  try {
    const favorite = await prisma.memberFavorite.create({
      data: { member_id: params.id, property_id: propertyId },
    });
    return NextResponse.json({ favorite }, { status: 201 });
  } catch {
    // 既にお気に入り済みの場合（unique 制約違反）
    const existing = await prisma.memberFavorite.findUnique({
      where: { member_id_property_id: { member_id: params.id, property_id: propertyId } },
    });
    return NextResponse.json({ favorite: existing, already_exists: true });
  }
}
