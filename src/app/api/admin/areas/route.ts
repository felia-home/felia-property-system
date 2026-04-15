import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const areas = await prisma.areaSetting.findMany({
    orderBy: { sort_order: "asc" },
  });
  return NextResponse.json({ areas });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    area_name: string;
    area_type?: string;
    image_url?: string;
    description?: string;
    link_url?: string;
    is_active?: boolean;
    sort_order?: number;
  };

  if (!body.area_name?.trim()) {
    return NextResponse.json({ error: "エリア名は必須です" }, { status: 400 });
  }

  const area = await prisma.areaSetting.create({
    data: {
      area_name: body.area_name.trim(),
      area_type: body.area_type ?? "ward",
      image_url: body.image_url || null,
      description: body.description || null,
      link_url: body.link_url || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    },
  });
  return NextResponse.json(area, { status: 201 });
}
