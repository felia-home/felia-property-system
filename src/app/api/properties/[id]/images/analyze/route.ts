import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzePropertyImage } from "@/agents/image-analyzer";

// POST /api/properties/[id]/images/analyze
// Bulk-analyze all unanalyzed images for a property
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: { property_type: true, rooms: true, area_build_m2: true },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const unanalyzed = await prisma.propertyImage.findMany({
      where: { property_id: params.id, ai_analyzed_at: null },
      orderBy: { order: "asc" },
    });

    if (unanalyzed.length === 0) {
      return NextResponse.json({ analyzed: 0, skipped: 0, errors: 0, results: [] });
    }

    const context = {
      property_type: property.property_type ?? undefined,
      rooms: property.rooms ?? undefined,
      area_build_m2: property.area_build_m2 ?? undefined,
    };

    // Process in batches of 3 (parallel)
    const BATCH = 3;
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let errors = 0;

    for (let i = 0; i < unanalyzed.length; i += BATCH) {
      const batch = unanalyzed.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (img) => {
          try {
            const analysis = await analyzePropertyImage(img.url, context);
            await prisma.propertyImage.update({
              where: { id: img.id },
              data: {
                room_type: analysis.room_type,
                ai_caption: analysis.ai_caption,
                ai_pr_text: analysis.ai_pr_text,
                ai_confidence: analysis.ai_confidence,
                ai_analyzed_at: new Date(),
              },
            });
            results.push({ id: img.id, success: true });
          } catch (err) {
            errors++;
            results.push({ id: img.id, success: false, error: String(err) });
          }
        })
      );
    }

    return NextResponse.json({
      analyzed: results.filter(r => r.success).length,
      skipped: 0,
      errors,
      results,
    });
  } catch (error) {
    console.error("POST /api/properties/[id]/images/analyze error:", error);
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}
