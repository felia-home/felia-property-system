import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    year_month?: string;
    area?: string;
    property_type?: string;
    comment?: string | null;
    image_url_1?: string | null;
    image_url_2?: string | null;
    image_url_3?: string | null;
    is_active?: boolean;
    sort_order?: number;
  };
  const result = await prisma.saleResult.update({
    where: { id: params.id },
    data: {
      ...(body.year_month !== undefined && { year_month: body.year_month }),
      ...(body.area !== undefined && { area: body.area }),
      ...(body.property_type !== undefined && { property_type: body.property_type }),
      ...(body.comment !== undefined && { comment: body.comment }),
      ...(body.image_url_1 !== undefined && { image_url_1: body.image_url_1 }),
      ...(body.image_url_2 !== undefined && { image_url_2: body.image_url_2 }),
      ...(body.image_url_3 !== undefined && { image_url_3: body.image_url_3 }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    },
  });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  await prisma.saleResult.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
