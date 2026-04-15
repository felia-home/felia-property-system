import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const results = await prisma.saleResult.findMany({ orderBy: { sort_order: "asc" } });
  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    year_month?: string;
    area?: string;
    property_type?: string;
    comment?: string;
    image_url_1?: string;
    image_url_2?: string;
    image_url_3?: string;
    is_active?: boolean;
    sort_order?: number;
  };
  const result = await prisma.saleResult.create({
    data: {
      year_month: body.year_month ?? "",
      area: body.area ?? "",
      property_type: body.property_type ?? "",
      comment: body.comment || null,
      image_url_1: body.image_url_1 || null,
      image_url_2: body.image_url_2 || null,
      image_url_3: body.image_url_3 || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    },
  });
  return NextResponse.json(result);
}
