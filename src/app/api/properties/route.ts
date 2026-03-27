import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/properties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { city: { contains: search } },
        { address: { contains: search } },
        { station_name1: { contains: search } },
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

// POST /api/properties
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.property_type) {
      return NextResponse.json({ error: "物件種別は必須です" }, { status: 400 });
    }

    const BOOL = new Set([
      "price_tax_inc","private_road","setback_required",
      "eq_autolock","eq_elevator","eq_parking","eq_bike_parking","eq_storage",
      "eq_pet_ok","eq_system_kitchen","eq_all_electric","eq_floor_heating","eq_ac",
      "eq_solar","eq_home_security","eq_walk_in_closet","eq_2f_washroom","eq_washlet",
      "eq_bathroom_dryer","eq_tv_intercom","eq_fiber_optic","eq_bs_cs",
      "eq_gas_city","eq_gas_prop","eq_water_city","eq_water_well",
      "eq_sewage","eq_septic","eq_corner","eq_top_floor",
      "eq_new_interior","eq_new_exterior","eq_reform_kitchen","eq_reform_bath",
      "published_hp","published_members","published_suumo","published_athome",
      "published_yahoo","published_homes","compliance_checked",
    ]);
    const NUM = new Set([
      "price","price_land","price_build","price_per_m2",
      "station_walk1","station_walk2","station_walk3",
      "area_land_m2","area_land_tsubo","area_build_m2","area_build_tsubo",
      "area_exclusive_m2","area_exclusive_tsubo","area_balcony_m2",
      "building_year","building_month","floors_total","floors_basement","floor_unit","total_units",
      "bcr","far","road_width","setback_area",
      "management_fee","repair_reserve","other_monthly_fee","land_lease_fee",
      "fixed_asset_tax","city_planning_tax","eq_parking_fee",
    ]);

    const data: Record<string, unknown> = {
      status: "DRAFT",
    };

    for (const [k, v] of Object.entries(body)) {
      if (k === "id" || k === "created_at" || k === "updated_at") continue;
      if (v === null || v === undefined || v === "") continue;
      if (BOOL.has(k)) { data[k] = Boolean(v); continue; }
      if (NUM.has(k)) { data[k] = Number(v); continue; }
      data[k] = v;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const property = await prisma.property.create({ data: data as any });
    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json({ error: "物件の登録に失敗しました" }, { status: 500 });
  }
}
