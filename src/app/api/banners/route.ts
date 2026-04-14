import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const banners = await prisma.banner.findMany({
    orderBy: [{ position: "asc" }, { slot: "asc" }],
  });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await req.json() as {
    title?: string;
    image_url: string;
    link_url?: string;
    link_target?: string;
    position?: string;
    slot?: number;
    sort_order?: number;
    is_active?: boolean;
  };

  const banner = await prisma.banner.create({
    data: {
      title: body.title ?? "",
      image_url: body.image_url,
      link_url: body.link_url || null,
      link_target: body.link_target ?? "_self",
      position: body.position ?? "TOP",
      slot: body.slot ?? 1,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
    },
  });
  return NextResponse.json({ success: true, banner });
}
