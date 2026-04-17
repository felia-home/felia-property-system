import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const feature = await prisma.feature.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      image_url: body.image_url,
      link_url: body.link_url,
      is_active: body.is_active,
      sort_order: body.sort_order,
      ...(body.conditions    !== undefined && { conditions:    body.conditions }),
      ...(body.sort_type     !== undefined && { sort_type:     body.sort_type }),
      ...(body.display_limit !== undefined && { display_limit: body.display_limit }),
    },
  });
  return NextResponse.json({ success: true, feature });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.feature.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
