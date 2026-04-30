import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/hp/properties/[id]/env-images — HP向け、認証なし
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const links = await prisma.propertyEnvImageLink.findMany({
    where: { property_id: params.id },
    include: { env_image: true },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({
    images: links.map(l => ({
      id:            l.env_image.id,
      url:           l.env_image.url,
      facility_name: l.env_image.facility_name,
      facility_type: l.env_image.facility_type,
      caption:       l.env_image.caption ?? l.env_image.ai_caption,
      address:       l.env_image.address,
      latitude:      l.env_image.latitude,
      longitude:     l.env_image.longitude,
      city:          l.env_image.city,
      walk_minutes:  l.walk_minutes,
    })),
  });
}
