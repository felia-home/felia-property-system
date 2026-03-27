import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UPDATABLE_FIELDS = [
  "property_type","transaction_type","brokerage_type","status",
  "title","catch_copy","description_hp","description_portal","description_suumo","description_athome",
  "prefecture","city","address","address_chiban","postal_code",
  "price","price_land","price_build","price_tax_inc","price_per_m2",
  "station_line1","station_name1","station_walk1",
  "station_line2","station_name2","station_walk2",
  "station_line3","station_name3","station_walk3",
  "area_land_m2","area_land_tsubo","area_build_m2","area_build_tsubo",
  "area_exclusive_m2","area_exclusive_tsubo","area_balcony_m2",
  "rooms","building_year","building_month","structure",
  "floors_total","floors_basement","floor_unit","direction","total_units",
  "city_plan","use_zone","bcr","far","land_right","land_category",
  "road_side","road_width","road_type","private_road","setback_required","setback_area",
  "management_fee","repair_reserve","other_monthly_fee","land_lease_fee",
  "fixed_asset_tax","city_planning_tax","management_type","management_company",
  "delivery_timing","delivery_status","reins_number","reins_registered_at","ad_valid_until",
  "eq_autolock","eq_elevator","eq_parking","eq_parking_fee","eq_bike_parking","eq_storage",
  "eq_pet_ok","eq_system_kitchen","eq_all_electric","eq_floor_heating","eq_ac",
  "eq_solar","eq_home_security","eq_walk_in_closet","eq_2f_washroom","eq_washlet",
  "eq_bathroom_dryer","eq_tv_intercom","eq_fiber_optic","eq_bs_cs",
  "eq_gas_city","eq_gas_prop","eq_water_city","eq_water_well",
  "eq_sewage","eq_septic","eq_corner","eq_top_floor",
  "eq_new_interior","eq_new_exterior","eq_reform_kitchen","eq_reform_bath",
  "published_hp","published_members","published_suumo","published_athome",
  "published_yahoo","published_homes",
  "suumo_id","athome_id","yahoo_id","homes_id",
  "compliance_checked","agent_id","store_id","internal_memo","source",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({ where: { id: params.id } });
    if (!property) return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in body) data[key] = body[key];
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }
    const property = await prisma.property.update({ where: { id: params.id }, data });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("PATCH /api/properties/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.property.update({
      where: { id: params.id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("DELETE /api/properties/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
