import { NextRequest, NextResponse } from "next/server";
import { scrapePropertyFromUrl } from "@/lib/property-scraper";
import { getSiteName } from "@/lib/scraper-registry";

/**
 * POST /api/documents/scrape-url
 * body: { url: string }
 * 他社ハトサポシステムサイトの物件詳細ページURLから物件情報を取得
 * 内部管理用途のみ・公開不可
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url?: string };

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 });
    }

    // Basic URL validation - must be a property detail page
    if (!url.includes("k_number=") && !url.includes("detail.php") && !url.includes("/realestate/")) {
      return NextResponse.json({
        error: "物件詳細ページのURLを入力してください（例: .../detail.php?k_number=H001...）",
      }, { status: 400 });
    }

    const result = await scrapePropertyFromUrl(url);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      system: result.system,
      site_name: getSiteName(url),
      data: result.data,
      // Normalize to same shape as parse-text response
      extracted: result.data,
      confidence: {}, // structural parse — no per-field confidence
      needs_review: buildNeedsReview(result.data ?? {}),
      low_confidence_fields: [],
    });
  } catch (error) {
    console.error("POST /api/documents/scrape-url error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

function buildNeedsReview(data: Record<string, unknown>): string[] {
  const required = ["property_type", "price", "city", "station_name1", "station_walk1"];
  return required.filter(k => !data[k]);
}
