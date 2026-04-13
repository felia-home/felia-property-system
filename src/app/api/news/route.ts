import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const published_only = searchParams.get("published") === "true";

  const news = await prisma.news.findMany({
    where: published_only ? { is_published: true } : {},
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return NextResponse.json({ news });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const news = await prisma.news.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category || "NEWS",
      is_published: body.is_published ?? false,
      published_at: body.is_published ? new Date() : null,
    },
  });
  return NextResponse.json({ success: true, news });
}
