import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UPDATABLE = [
  "listing_type", "is_land", "is_house", "is_mansion",
  "area", "town", "price", "area_land_m2", "area_build_m2",
  "commission", "note", "seller_name", "agent_id",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const key of UPDATABLE) {
      if (key in body) data[key] = body[key] === "" ? null : body[key];
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }
    const property = await prisma.privateProperty.update({
      where: { id: params.id },
      data,
      include: { agent: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("PATCH /api/private-properties/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
