import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    name?: string;
    distribute_month?: string;
    front_image_url?: string | null;
    back_image_url?: string | null;
    pdf_url?: string | null;
    is_active?: boolean;
    sort_order?: number;
  };
  const flyer = await prisma.webFlyer.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.distribute_month !== undefined && { distribute_month: body.distribute_month }),
      ...(body.front_image_url !== undefined && { front_image_url: body.front_image_url }),
      ...(body.back_image_url !== undefined && { back_image_url: body.back_image_url }),
      ...(body.pdf_url !== undefined && { pdf_url: body.pdf_url }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    },
  });
  return NextResponse.json(flyer);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  await prisma.webFlyer.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
