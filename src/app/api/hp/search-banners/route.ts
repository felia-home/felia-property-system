import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/hp/search-banners — HP向け公開API（アクティブなバナーのみ）
export async function GET() {
  try {
    const banners = await prisma.searchBanner.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        title: true,
        image_url: true,
        link_url: true,
        link_target: true,
        sort_order: true,
      },
    });
    return NextResponse.json({ banners });
  } catch (error) {
    console.error("search-banners API error:", error);
    return NextResponse.json({ banners: [] });
  }
}
