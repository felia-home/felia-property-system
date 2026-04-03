import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePropertyCopy, buildPhotoContext } from "@/agents/property-copy";

// POST /api/properties/[id]/generate-content
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        images: {
          where: { ai_analyzed_at: { not: null } },
          select: { room_type: true, ai_pr_text: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const propertyData = property as Record<string, unknown>;

    const photos = (property.images ?? [])
      .filter(img => img.room_type && img.ai_pr_text)
      .map(img => ({ room_type: img.room_type!, ai_pr_text: img.ai_pr_text! }));

    const copy = await generatePropertyCopy(propertyData, photos);

    await prisma.property.update({
      where: { id: params.id },
      data: {
        title:              copy.title              || undefined,
        catch_copy:         copy.catch_copy         || undefined,
        description_hp:     copy.description_hp     || undefined,
        description_suumo:  copy.description_suumo  || undefined,
        description_athome: copy.description_athome || undefined,
        selling_points:     copy.selling_points.length > 0 ? copy.selling_points : undefined,
      },
    });

    return NextResponse.json({ copy });
  } catch (error) {
    console.error("POST /api/properties/[id]/generate-content error:", error);
    return NextResponse.json(
      { error: "広告文生成に失敗しました" },
      { status: 500 }
    );
  }
}
