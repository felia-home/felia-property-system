import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const news = await prisma.news.findMany({
    where: { is_published: true },
    orderBy: { published_at: "desc" },
    take: 10,
  });
  return NextResponse.json({ news });
}
