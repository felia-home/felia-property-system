import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchHatsupoListPage, scrapePropertyFromUrl } from "@/lib/property-scraper";
import { getSiteName } from "@/lib/scraper-registry";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * POST /api/competitor/sync
 * body: { sites: string[] } — list URLs of competitor sites
 * 指定サイトの物件一覧をスクレイプしてCompetitorListingに保存
 */
export async function POST(request: NextRequest) {
  try {
    const { sites = [] } = await request.json() as { sites?: string[] };
    if (!sites.length) return NextResponse.json({ error: "サイトURLが必要です" }, { status: 400 });

    const summary: Array<{ site: string; scraped: number; new: number; sold: number; errors: number }> = [];

    for (const siteUrl of sites) {
      const siteName = getSiteName(siteUrl);
      let scraped = 0, newCount = 0, soldCount = 0, errors = 0;

      try {
        const listResult = await fetchHatsupoListPage(siteUrl);
        if (!listResult.success || !listResult.items) { errors++; continue; }

        const currentKNumbers = new Set(listResult.items.map(i => i.kNumber));
        const domain = new URL(siteUrl).hostname.replace(/^www\./, "");

        // Detect sold: previously seen, now gone
        const prevListings = await prisma.competitorListing.findMany({
          where: { source: domain, sold_detected_at: null },
          select: { source_id: true },
        });
        for (const prev of prevListings) {
          if (!currentKNumbers.has(prev.source_id)) {
            await prisma.competitorListing.update({
              where: { source_source_id: { source: domain, source_id: prev.source_id } },
              data: { sold_detected_at: new Date() },
            });
            soldCount++;
          }
        }

        // Scrape each listing
        for (const item of listResult.items.slice(0, 50)) { // max 50 per sync
          await sleep(1500);
          try {
            const result = await scrapePropertyFromUrl(item.detailUrl);
            if (!result.success || !result.data) { errors++; continue; }

            const prop = result.data;
            scraped++;

            const existing = await prisma.competitorListing.findUnique({
              where: { source_source_id: { source: domain, source_id: item.kNumber } },
            });

            const priceHistory = existing?.price_history as Array<{ price: number; date: string }> | null ?? [];
            if (existing?.price && existing.price !== prop.price && prop.price) {
              priceHistory.push({ price: existing.price, date: existing.last_seen_at.toISOString() });
            }

            const upsertData = {
              source: domain,
              source_id: item.kNumber,
              property_type: prop.property_type ?? null,
              address_city: prop.city ?? null,
              station_name: prop.station_name1 ?? null,
              station_walk: prop.station_walk1 ?? null,
              price: prop.price ?? null,
              area_m2: prop.area_build_m2 ?? prop.area_exclusive_m2 ?? prop.area_land_m2 ?? null,
              rooms: prop.rooms ?? null,
              last_seen_at: new Date(),
              price_history: priceHistory.length ? priceHistory : undefined,
            };

            if (existing) {
              await prisma.competitorListing.update({ where: { source_source_id: { source: domain, source_id: item.kNumber } }, data: upsertData });
            } else {
              await prisma.competitorListing.create({ data: { ...upsertData, first_seen_at: new Date() } });
              newCount++;
            }
          } catch { errors++; }
        }
      } catch { errors++; }

      summary.push({ site: siteName, scraped, new: newCount, sold: soldCount, errors });
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("POST /api/competitor/sync error:", error);
    return NextResponse.json({ error: "同期に失敗しました" }, { status: 500 });
  }
}
