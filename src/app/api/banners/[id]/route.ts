import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await req.json() as {
    title?: string;
    image_url?: string;
    link_url?: string | null;
    link_target?: string;
    position?: string;
    slot?: number;
    sort_order?: number;
    is_active?: boolean;
    banner_type?: string;
  };

  const banner = await prisma.banner.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
      ...(body.link_url !== undefined && { link_url: body.link_url }),
      ...(body.link_target !== undefined && { link_target: body.link_target }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.slot !== undefined && { slot: body.slot }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.banner_type !== undefined && { banner_type: body.banner_type }),
    },
  });
  return NextResponse.json({ success: true, banner });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  await prisma.banner.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
