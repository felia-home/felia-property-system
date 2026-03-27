import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePropertyContent } from "@/agents/document-parser";
import { generateLifestyleContent, generateEnvironmentSummary } from "@/agents/property-copy";

// POST /api/properties/[id]/generate-content
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const propertyData = property as Record<string, unknown>;

    const [content, lifestyle, environment] = await Promise.all([
      generatePropertyContent(propertyData),
      generateLifestyleContent(propertyData),
      generateEnvironmentSummary(propertyData),
    ]);

    await prisma.property.update({
      where: { id: params.id },
      data: {
        title: content.title || undefined,
        catch_copy: content.catch_copy || undefined,
        description_hp: content.description_hp || undefined,
        description_portal: content.description_portal || undefined,
      },
    });

    return NextResponse.json({ content, lifestyle, environment });
  } catch (error) {
    console.error("POST /api/properties/[id]/generate-content error:", error);
    return NextResponse.json(
      { error: "コンテンツ生成に失敗しました" },
      { status: 500 }
    );
  }
}
