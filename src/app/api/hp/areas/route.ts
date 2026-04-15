import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/hp/areas — HP向け公開API（アクティブなエリアのみ・sort_order昇順）
export async function GET() {
  try {
    const areas = await prisma.areaSetting.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        area_name: true,
        area_type: true,
        image_url: true,
        description: true,
        link_url: true,
        is_active: true,
        sort_order: true,
      },
    });
    return NextResponse.json({ areas });
  } catch (error) {
    console.error("areas API error:", error);
    return NextResponse.json({ areas: [] });
  }
}
