import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/competitor/listings
 * CompetitorListingの一覧を返す
 */
export async function GET() {
  try {
    const listings = await prisma.competitorListing.findMany({
      orderBy: { last_seen_at: "desc" },
      take: 500,
    });
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("GET /api/competitor/listings error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
