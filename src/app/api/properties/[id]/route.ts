import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ── 型変換ヘルパー ─────────────────────────────────────────────────────────────

const toInt = (v: unknown): number | null =>
  v == null ? null : (n => (isNaN(n) ? null : n))(parseInt(String(v), 10));

const toFloat = (v: unknown): number | null =>
  v == null ? null : (n => (isNaN(n) ? null : n))(parseFloat(String(v)));

const toBool = (v: unknown): boolean =>
  v === true || v === "true" || v === 1 || v === "1";

const toDateTime = (v: unknown): Date | null =>
  v == null || v === "" ? null : new Date(String(v));

const toStringArray = (v: unknown): string[] | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    if (v.trim() === "") return [];
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return null;
};

// ── フィールド分類 ────────────────────────────────────────────────────────────

// NOT NULL 制約のある String フィールド — null を渡すとPrismaエラーになるため
// null/undefined を受け取った場合は update data から除外する（DB の既存値を保持）
const NOT_NULL_STRING_FIELDS = new Set([
  "property_type",
  "transaction_type",
  "brokerage_type",
  "status",
  "prefecture",
  "city",
  "address",
  "address_display_level",
  "ad_transfer_consent",
]);

const STRING_FIELDS = new Set([
  "property_type","transaction_type","brokerage_type","status",
  "title","catch_copy","description_hp","description_portal","description_suumo","description_athome",
  "prefecture","city","address","address_chiban","postal_code",
  "address_display_level","address_display_custom","town","building_block","building_name","room_number",
  "ad_transfer_consent",
  "station_line1","station_name1","station_line2","station_name2","station_line3","station_name3",
  "bus_stop1","bus_stop2","bus_stop3",
  "rooms","structure","direction",
  "city_plan","use_zone","land_right","land_category",
  "road_side","road_type","road_direction","road_contact","rebuild_allowed",
  "management_type","management_company",
  "delivery_timing","delivery_status","reins_number","reins_status","delivery_condition",
  "seller_company","seller_phone","seller_contact","seller_agent","seller_fax","seller_transaction_type","seller_brokerage_type",
  "suumo_id","athome_id","yahoo_id","homes_id",
  "property_number","internal_memo","source","tour_url","mansion_building_id",
  // agent_id / store_id / successor_agent_id はリレーションIDのため connect/disconnect で処理
  "ad_confirmation_method","ad_confirmed_by","ad_confirmation_file",
  "last_confirmed_by","last_check_result",
  "eq_earthquake_resistant",
  "env_elementary_school","env_junior_high_school","env_supermarket","env_hospital","env_park",
  "env_disaster_risk","env_crime_level","env_noise_level","env_sunlight","env_view",
]);

const INT_FIELDS = new Set([
  "price","price_land","price_build",
  "station_walk1","station_walk2","station_walk3",
  "bus_time1","bus_time2","bus_time3",
  "building_year","building_month","floors_total","floors_basement","floor_unit","total_units","rooms_count",
  "management_fee","repair_reserve","other_monthly_fee","land_lease_fee",
  "fixed_asset_tax","city_planning_tax",
  "purchase_price",
  "eq_parking_fee","eq_toilet_count","eq_bicycle_count","eq_reform_year",
  "photo_count","days_on_market","inquiry_count",
]);

const FLOAT_FIELDS = new Set([
  "latitude","longitude","price_per_m2",
  "area_land_m2","area_land_tsubo","area_build_m2","area_build_tsubo",
  "area_exclusive_m2","area_exclusive_tsubo","area_balcony_m2",
  "ldk_size","bcr","far","road_width","setback_area","eq_ceiling_height",
]);

const BOOL_FIELDS = new Set([
  "price_tax_inc","price_negotiable",
  "private_road","setback_required","building_conditions",
  "national_land_act","agricultural_act","landscape_act",
  "eq_autolock","eq_elevator","eq_parking","eq_bike_parking","eq_storage",
  "eq_pet_ok","eq_system_kitchen","eq_all_electric","eq_floor_heating","eq_ac",
  "eq_solar","eq_home_security","eq_walk_in_closet","eq_2f_washroom","eq_washlet",
  "eq_bathroom_dryer","eq_tv_intercom","eq_fiber_optic","eq_bs_cs",
  "eq_gas_city","eq_gas_prop","eq_water_city","eq_water_well",
  "eq_sewage","eq_septic","eq_corner","eq_top_floor",
  "eq_new_interior","eq_new_exterior","eq_reform_kitchen","eq_reform_bath",
  "eq_counter_kitchen","eq_cupboard","eq_pantry","eq_touchless_faucet",
  "eq_unit_bath","eq_separate_bath_toilet","eq_double_wash","eq_laundry_space","eq_laundry_outdoor",
  "eq_washlet_all",
  "eq_shoe_closet","eq_trunk_room","eq_roof_storage","eq_all_room_storage",
  "eq_high_insulation","eq_long_quality","eq_zeh","eq_storage_battery","eq_ev_charger",
  "eq_double_glazing","eq_ventilation",
  "eq_crime_prevention_glass","eq_electronic_lock","eq_security_light",
  "eq_parking_roofed","eq_parking_2cars","eq_electric_shutter",
  "eq_floor_heating_all","eq_barrier_free","eq_elevator_private",
  "eq_optical_fiber","eq_cable_tv","eq_interphone_video",
  "eq_terrace","eq_roof_balcony","eq_patio","eq_wood_deck",
  "eq_reformed","eq_renovated",
  "eq_new_kitchen","eq_new_bath","eq_new_toilet","eq_new_floor","eq_new_wall",
  "eq_seismic_isolation","eq_vibration_control",
  "published_hp","published_members","published_suumo","published_athome","published_yahoo","published_homes",
  "compliance_checked",
  "photo_has_exterior","photo_has_floor_plan","photo_has_interior",
  "is_felia_selection","is_open_house",
]);

const DATETIME_FIELDS = new Set([
  "reins_registered_at","ad_valid_until","reins_updated_at",
  "purchase_date",
  "ad_confirmation_sent_at","ad_confirmed_at",
  "photo_last_updated_at",
  "last_confirmed_at",
  "published_at",
  "open_house_start","open_house_end",
]);

// String[] 型フィールド（カンマ区切り文字列 or 配列を受け付ける）
const STRING_ARRAY_FIELDS = new Set([
  "pending_tasks","selling_points","features","legal_restrictions",
]);

// Json 型フィールド — そのまま渡す
const JSON_FIELDS = new Set([
  "use_zones","roads","last_check_result",
]);

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // select を指定しないため Property の全スカラフィールドを返却する
    // （building_name / area_exclusive_m2 / building_year / building_month /
    //  features 等を含む）。
    const property = await prisma.property.findUnique({ where: { id: params.id } });
    if (!property) return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(body)) {
      if (STRING_FIELDS.has(key)) {
        // NOT NULL フィールドに null/undefined が来た場合はスキップ（DB既存値を保持）
        if (NOT_NULL_STRING_FIELDS.has(key) && (val === null || val === undefined)) continue;
        data[key] = val;
      } else if (INT_FIELDS.has(key)) {
        data[key] = toInt(val);
      } else if (FLOAT_FIELDS.has(key)) {
        data[key] = toFloat(val);
      } else if (BOOL_FIELDS.has(key)) {
        data[key] = toBool(val);
      } else if (DATETIME_FIELDS.has(key)) {
        data[key] = toDateTime(val);
      } else if (STRING_ARRAY_FIELDS.has(key)) {
        // String[] NOT NULL のため null は [] にフォールバック
        data[key] = toStringArray(val) ?? [];
      } else if (JSON_FIELDS.has(key)) {
        data[key] = val;
      }
      // 未知フィールドは無視（セキュリティ上のallowlist）
    }

    // ── リレーションID → connect / disconnect 変換 ───────────────────────────────
    if ("agent_id" in body) {
      const v = body.agent_id as string | null | undefined;
      data.agent = v ? { connect: { id: v } } : { disconnect: true };
    }
    if ("store_id" in body) {
      const v = body.store_id as string | null | undefined;
      data.store = v ? { connect: { id: v } } : { disconnect: true };
    }
    if ("successor_agent_id" in body) {
      const v = body.successor_agent_id as string | null | undefined;
      data.successor_agent = v ? { connect: { id: v } } : { disconnect: true };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    // published_hp の変更に連動してワークフローステータスを自動更新
    // 終端ステータス（SOLD / CLOSED）は上書きしない
    if ("published_hp" in body) {
      const current = await prisma.property.findUnique({
        where: { id: params.id },
        select: { status: true },
      });
      const terminal = ["SOLD", "CLOSED"];
      if (current && !terminal.includes(current.status)) {
        if (toBool(body.published_hp)) {
          data.status = "PUBLISHED";   // 掲載中（PUBLISHING=掲載準備中 とは別）
        } else {
          data.status = "AD_OK";
        }
      }
    }

    const property = await prisma.property.update({ where: { id: params.id }, data });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("PATCH /api/properties/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

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
