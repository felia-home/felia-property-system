import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const features = await prisma.feature.findMany({
    orderBy: { sort_order: "asc" },
  });
  return NextResponse.json({ features });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const feature = await prisma.feature.create({
    data: {
      title: body.title,
      description: body.description || null,
      image_url: body.image_url || null,
      link_url: body.link_url || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      conditions:    body.conditions    ?? {},
      sort_type:     body.sort_type     ?? "newest",
      display_limit: body.display_limit ?? 20,
    },
  });
  return NextResponse.json({ success: true, feature });
}
