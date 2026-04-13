import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const news = await prisma.news.findUnique({ where: { id: params.id } });
  if (!news) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ news });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const news = await prisma.news.update({
    where: { id: params.id },
    data: {
      title: body.title,
      content: body.content,
      category: body.category,
      is_published: body.is_published,
      published_at: body.is_published && !body.published_at ? new Date() : body.published_at,
    },
  });
  return NextResponse.json({ success: true, news });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.news.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
