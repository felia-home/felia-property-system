import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPropertyCheck } from "@/agents/property-check";

// POST /api/properties/[id]/check
// Triggers AI property existence / listing health check
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        property_type: true,
        price: true,
        city: true,
        town: true,
        address: true,
        station_name1: true,
        station_walk1: true,
        area_build_m2: true,
        area_land_m2: true,
        rooms: true,
        building_year: true,
        status: true,
        days_on_market: true,
        inquiry_count: true,
        published_at: true,
        ad_confirmed_at: true,
        reins_number: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const result = await runPropertyCheck(property);

    // Persist result
    await prisma.property.update({
      where: { id: params.id },
      data: {
        last_confirmed_at: result.checked_at,
        last_check_result: result as unknown as Record<string, unknown>,
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("POST /api/properties/[id]/check error:", error);
    return NextResponse.json({ error: "チェックに失敗しました" }, { status: 500 });
  }
}
