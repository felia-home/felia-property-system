import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/hp/banners — HP向け公開API（アクティブなバナーのみ・sort_order昇順）
export async function GET() {
  const banners = await prisma.banner.findMany({
    where: { is_active: true, banner_type: "free" },
    orderBy: { sort_order: "asc" },
    select: {
      id: true,
      image_url: true,
      link_url: true,
      link_target: true,
      sort_order: true,
    },
  });
  return NextResponse.json({ banners });
}
