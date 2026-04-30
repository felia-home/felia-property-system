import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/members/[id]/favorites/[propertyId] — お気に入り状態確認
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; propertyId: string } }
) {
  const favorite = await prisma.memberFavorite.findUnique({
    where: {
      member_id_property_id: {
        member_id:   params.id,
        property_id: params.propertyId,
      },
    },
  });
  return NextResponse.json({ is_favorite: !!favorite });
}

// DELETE /api/members/[id]/favorites/[propertyId] — お気に入り削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; propertyId: string } }
) {
  const member = await prisma.member.findFirst({
    where: { id: params.id, is_active: true },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.memberFavorite.deleteMany({
    where: { member_id: params.id, property_id: params.propertyId },
  });

  return NextResponse.json({ ok: true });
}
