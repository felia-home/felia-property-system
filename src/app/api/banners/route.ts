import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: "asc" }, { slot: "asc" }],
  });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const banner = await prisma.banner.create({
    data: {
      title: body.title,
      image_url: body.image_url,
      link_url: body.link_url || null,
      position: body.position || "TOP",
      slot: body.slot || 1,
      is_active: body.is_active ?? true,
    },
  });
  return NextResponse.json({ success: true, banner });
}
