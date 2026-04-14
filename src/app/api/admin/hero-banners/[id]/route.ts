import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/admin/hero-banners/[id] — バナー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    title?: string | null;
    image_url?: string;
    link_url?: string | null;
    link_target?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  const banner = await prisma.heroBanner.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
      ...(body.link_url !== undefined && { link_url: body.link_url }),
      ...(body.link_target !== undefined && { link_target: body.link_target }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
    },
  });
  return NextResponse.json(banner);
}

// DELETE /api/admin/hero-banners/[id] — バナー削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  await prisma.heroBanner.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
