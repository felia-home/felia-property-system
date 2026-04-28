import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;

  const result = await prisma.saleResult.update({
    where: { id: params.id },
    data: {
      ...(body.year_month !== undefined && { year_month: String(body.year_month) }),
      ...(body.area !== undefined && { area: String(body.area) }),
      ...(body.property_type !== undefined && { property_type: String(body.property_type) }),
      ...(body.comment !== undefined && { comment: body.comment ? String(body.comment) : null }),
      ...(body.image_url_1 !== undefined && { image_url_1: body.image_url_1 ? String(body.image_url_1) : null }),
      ...(body.image_url_2 !== undefined && { image_url_2: body.image_url_2 ? String(body.image_url_2) : null }),
      ...(body.image_url_3 !== undefined && { image_url_3: body.image_url_3 ? String(body.image_url_3) : null }),
      ...(body.is_active !== undefined && { is_active: Boolean(body.is_active) }),
      ...(body.sort_order !== undefined && { sort_order: Number(body.sort_order) }),
      // 拡張フィールド
      ...(body.sale_year !== undefined && { sale_year: body.sale_year != null ? Number(body.sale_year) : null }),
      ...(body.sale_month !== undefined && { sale_month: body.sale_month != null ? Number(body.sale_month) : null }),
      ...(body.area_ward !== undefined && { area_ward: body.area_ward ? String(body.area_ward) : null }),
      ...(body.area_town !== undefined && { area_town: body.area_town ? String(body.area_town) : null }),
      ...(body.floor_plan_image_url !== undefined && { floor_plan_image_url: body.floor_plan_image_url ? String(body.floor_plan_image_url) : null }),
      ...(body.staff_id !== undefined && { staff_id: body.staff_id ? String(body.staff_id) : null }),
      ...(body.property_id !== undefined && { property_id: body.property_id ? String(body.property_id) : null }),
      ...(body.latitude !== undefined  && { latitude:  body.latitude  != null && body.latitude  !== "" ? Number(body.latitude)  : null }),
      ...(body.longitude !== undefined && { longitude: body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null }),
    },
    include: {
      staff: { select: { id: true, name: true, photo_url: true } },
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
