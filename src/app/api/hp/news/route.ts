import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'property' | 'information' | null

    // type パラメータを category に変換
    let categoryFilter: string | undefined;
    if (type === "property") {
      categoryFilter = "NEWS";
    } else if (type === "information") {
      categoryFilter = "INFORMATION";
    }

    const news = await prisma.news.findMany({
      where: {
        is_published: true,
        ...(categoryFilter ? { category: categoryFilter } : {}),
      },
      orderBy: { published_at: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        published_at: true,
        is_published: true,
      },
    });

    const formatted = news.map((n) => ({
      ...n,
      news_type: n.category === "NEWS" ? "property" : "information",
    }));

    return NextResponse.json({ news: formatted });
  } catch (error) {
    console.error("hp/news error:", error);
    return NextResponse.json({ news: [] });
  }
}
