import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/hp/area-columns?area=渋谷区
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area") ?? "";

  const where: Record<string, unknown> = { is_active: true };
  if (area) where["area"] = area;

  const columns = await prisma.areaColumn.findMany({
    where,
    orderBy: [{ sort_order: "asc" }, { published_at: "desc" }],
    select: {
      id: true,
      area: true,
      title: true,
      content: true,
      image_url: true,
      published_at: true,
    },
  });

  return NextResponse.json({ columns });
}
