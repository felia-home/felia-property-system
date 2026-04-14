import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const banners = await prisma.searchBanner.findMany({
    orderBy: { sort_order: "asc" },
  });
  return NextResponse.json({ banners });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    title?: string;
    image_url: string;
    link_url?: string;
    link_target?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  if (!body.image_url) {
    return NextResponse.json({ error: "画像URLは必須です" }, { status: 400 });
  }

  const banner = await prisma.searchBanner.create({
    data: {
      title: body.title || null,
      image_url: body.image_url,
      link_url: body.link_url || null,
      link_target: body.link_target ?? "_self",
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
    },
  });
  return NextResponse.json(banner, { status: 201 });
}
