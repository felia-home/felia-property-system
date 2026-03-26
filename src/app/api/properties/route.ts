import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/properties — 物件一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const store = searchParams.get("store");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      is_deleted: false,
    };

    if (status) where.status = status;
    if (store) where.store_id = store;
    if (search) {
      where.OR = [
        { city: { contains: search } },
        { address: { contains: search } },
        { station_name: { contains: search } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return NextResponse.json({ properties, total: properties.length });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json({ error: "物件一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/properties — 物件新規登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 必須項目チェック
    const required = ["property_type", "price", "city", "station_name", "station_walk"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `必須項目が不足しています: ${field}` },
          { status: 400 }
        );
      }
    }

    const property = await prisma.property.create({
      data: {
        property_type: body.property_type,
        status: "DRAFT",
        prefecture: body.prefecture ?? "東京都",
        city: body.city,
        address: body.address ?? "",
        price: Number(body.price),
        station_line: body.station_line ?? "",
        station_name: body.station_name,
        station_walk: Number(body.station_walk),
        area_land_m2: body.area_land_m2 ? Number(body.area_land_m2) : null,
        area_build_m2: body.area_build_m2 ? Number(body.area_build_m2) : null,
        area_exclusive_m2: body.area_exclusive_m2 ? Number(body.area_exclusive_m2) : null,
        rooms: body.rooms ?? "",
        building_year: body.building_year ? Number(body.building_year) : null,
        structure: body.structure ?? "",
        delivery_timing: body.delivery_timing ?? "",
        management_fee: body.management_fee ? Number(body.management_fee) : null,
        repair_reserve: body.repair_reserve ? Number(body.repair_reserve) : null,
        reins_number: body.reins_number ?? null,
        published_hp: false,
        published_suumo: false,
        published_athome: false,
        compliance_checked: false,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json({ error: "物件の登録に失敗しました" }, { status: 500 });
  }
}
