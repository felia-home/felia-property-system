import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    area_name?: string;
    area_type?: string;
    image_url?: string | null;
    description?: string | null;
    link_url?: string | null;
    is_active?: boolean;
    sort_order?: number;
  };

  const area = await prisma.areaSetting.update({
    where: { id: params.id },
    data: {
      ...(body.area_name !== undefined && { area_name: body.area_name }),
      ...(body.area_type !== undefined && { area_type: body.area_type }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.link_url !== undefined && { link_url: body.link_url }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    },
  });
  return NextResponse.json(area);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  await prisma.areaSetting.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
