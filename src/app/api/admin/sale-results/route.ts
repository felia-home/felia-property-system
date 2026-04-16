import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const results = await prisma.saleResult.findMany({
    orderBy: [{ sort_order: "asc" }, { sale_year: "desc" }, { sale_month: "desc" }],
    include: {
      staff: { select: { id: true, name: true, photo_url: true } },
    },
  });
  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;

  const result = await prisma.saleResult.create({
    data: {
      year_month: String(body.year_month ?? ""),
      area: String(body.area ?? body.area_ward ?? ""),
      property_type: String(body.property_type ?? ""),
      comment: body.comment ? String(body.comment) : null,
      image_url_1: body.image_url_1 ? String(body.image_url_1) : null,
      image_url_2: body.image_url_2 ? String(body.image_url_2) : null,
      image_url_3: body.image_url_3 ? String(body.image_url_3) : null,
      is_active: body.is_active !== false,
      sort_order: body.sort_order != null ? Number(body.sort_order) : 0,
      // 拡張フィールド
      sale_year: body.sale_year != null ? Number(body.sale_year) : null,
      sale_month: body.sale_month != null ? Number(body.sale_month) : null,
      area_ward: body.area_ward ? String(body.area_ward) : null,
      area_town: body.area_town ? String(body.area_town) : null,
      floor_plan_image_url: body.floor_plan_image_url ? String(body.floor_plan_image_url) : null,
      staff_id: body.staff_id ? String(body.staff_id) : null,
      property_id: body.property_id ? String(body.property_id) : null,
    },
    include: {
      staff: { select: { id: true, name: true, photo_url: true } },
    },
  });
  return NextResponse.json(result);
}
