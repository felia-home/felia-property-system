import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/private-properties?filter=ACTIVE|CLOSED|ALL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "ACTIVE";

    const where: Record<string, unknown> = {};
    if (filter === "ACTIVE") where.status = "ACTIVE";
    else if (filter === "CLOSED") where.status = "CLOSED";
    // ALL: no filter

    const properties = await prisma.privateProperty.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("GET /api/private-properties error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/private-properties
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    // Auto-generate property_no: UKK-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.privateProperty.count();
    const seq = String(count + 1).padStart(3, "0");
    const property_no = `UKK-${dateStr}-${seq}`;

    const property = await prisma.privateProperty.create({
      data: {
        property_no,
        listing_type:  String(body.listing_type  ?? "SENIN"),
        is_land:       Boolean(body.is_land),
        is_house:      body.is_house !== undefined ? Boolean(body.is_house) : true,
        is_mansion:    Boolean(body.is_mansion),
        area:          body.area       ? String(body.area)       : null,
        town:          body.town       ? String(body.town)       : null,
        price:         body.price      ? Number(body.price)      : null,
        area_land_m2:  body.area_land_m2  ? Number(body.area_land_m2)  : null,
        area_build_m2: body.area_build_m2 ? Number(body.area_build_m2) : null,
        commission:    body.commission ? String(body.commission) : null,
        note:          body.note       ? String(body.note)       : null,
        seller_name:   body.seller_name ? String(body.seller_name) : null,
        agent_id:      body.agent_id   ? String(body.agent_id)   : null,
      },
      include: { agent: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error("POST /api/private-properties error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
