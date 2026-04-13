import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const banner = await prisma.banner.update({
    where: { id: params.id },
    data: {
      title: body.title,
      image_url: body.image_url,
      link_url: body.link_url,
      position: body.position,
      slot: body.slot,
      is_active: body.is_active,
    },
  });
  return NextResponse.json({ success: true, banner });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.banner.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
