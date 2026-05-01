import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePropertyNumber } from "@/lib/staffCode";

// GET /api/properties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ── 既存パラメータ ──────────────────────────────────────────
    const status        = searchParams.get("status");
    const search        = searchParams.get("search");      // keyword の後方互換
    const storeId       = searchParams.get("store_id");
    const agentId       = searchParams.get("agent_id");
    const noCopy        = searchParams.get("noCopy") === "true";
    const publishedHp   = searchParams.get("published_hp");

    // ── 新規パラメータ ──────────────────────────────────────────
    const city          = searchParams.get("city") ?? "";
    const keyword       = searchParams.get("keyword") ?? "";
    const propertyType  = searchParams.get("property_type") ?? "";
    const rooms         = searchParams.get("rooms") ?? "";
    const station       = searchParams.get("station") ?? "";
    const priceMin      = searchParams.get("price_min") ? Number(searchParams.get("price_min")) : null;
    const priceMax      = searchParams.get("price_max") ? Number(searchParams.get("price_max")) : null;
    const page          = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit         = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? "20")));

    // ── WHERE 条件（AND 配列で複数 OR 条件の衝突を回避）────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [{ is_deleted: false }];

    if (status)       andConditions.push({ status });
    if (storeId)      andConditions.push({ store_id: storeId });
    if (agentId)      andConditions.push({ agent_id: agentId });
    if (noCopy)       andConditions.push({ catch_copy: null });
    if (city)         andConditions.push({ city });
    if (propertyType) andConditions.push({ property_type: propertyType });
    if (rooms)        andConditions.push({ rooms: { contains: rooms } });
    if (publishedHp !== null) andConditions.push({ published_hp: publishedHp === "true" });

    if (priceMin !== null || priceMax !== null) {
      andConditions.push({
        price: {
          ...(priceMin !== null ? { gte: priceMin } : {}),
          ...(priceMax !== null ? { lte: priceMax } : {}),
        },
      });
    }

    // キーワード検索（?search= との後方互換あり）
    const kw = keyword || search || "";
    if (kw) {
      andConditions.push({
        OR: [
          { city:       { contains: kw } },
          { town:       { contains: kw } },
          { address:    { contains: kw } },
          { title:      { contains: kw } },
          { catch_copy: { contains: kw } },
          { station_name1: { contains: kw } },
        ],
      });
    }

    // 駅名検索（keyword とは独立した AND 条件）
    if (station) {
      andConditions.push({
        OR: [
          { station_name1: { contains: station } },
          { station_name2: { contains: station } },
          { station_name3: { contains: station } },
        ],
      });
    }

    const where = { AND: andConditions };

    // ── DB クエリ（件数 + ページネーション）────────────────────
    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: {
            select: { id: true, url: true, is_main: true },
            orderBy: [{ is_main: "desc" }, { order: "asc" }],
            take: 1,
          },
          _count: { select: { images: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      properties,
    });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json({ error: "物件一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/properties — 明示フィールドマッピング（スキーマに存在するフィールドのみ）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.property_type) {
      return NextResponse.json({ error: "物件種別は必須です" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const n = (v: unknown) => (v !== undefined && v !== null && v !== "" ? Number(v) : null);
    const bool = (v: unknown) => v === true || v === "true" || v === 1;

    // 物件番号の自動生成: agent_idのstaff_codeを使用
    let propertyNumber: string | null = b.property_number ? String(b.property_number) : null;
    if (!propertyNumber && b.agent_id) {
      const agentStaff = await prisma.staff.findUnique({
        where: { id: String(b.agent_id) },
        select: { staff_code: true },
      });
      if (agentStaff?.staff_code) {
        propertyNumber = await generatePropertyNumber(agentStaff.staff_code);
      }
    }

    const property = await prisma.property.create({
      data: {
        // 物件種別・取引態様
        property_type:      String(b.property_type ?? "USED_HOUSE"),
        transaction_type:   String(b.transaction_type ?? "仲介"),
        brokerage_type:     String(b.brokerage_type ?? "専任"),
        status:             "DRAFT",

        // キャッチコピー・説明
        title:              b.title              ? String(b.title)              : null,
        catch_copy:         b.catch_copy         ? String(b.catch_copy)         : null,
        description_hp:     b.description_hp     ? String(b.description_hp)     : null,
        description_portal: b.description_portal ? String(b.description_portal) : null,
        description_suumo:  b.description_suumo  ? String(b.description_suumo)  : null,
        description_athome: b.description_athome ? String(b.description_athome) : null,

        // 所在地
        prefecture:   String(b.prefecture ?? "東京都"),
        city:         String(b.city ?? ""),
        town:         b.town         ? String(b.town)         : null,
        address:      String(b.address ?? ""),
        address_chiban: b.address_chiban ? String(b.address_chiban) : null,
        postal_code:  b.postal_code  ? String(b.postal_code)  : null,

        // 価格
        price:        n(b.price) ?? 0,
        price_land:   n(b.price_land),
        price_build:  n(b.price_build),
        price_per_m2: n(b.price_per_m2),
        price_tax_inc: bool(b.price_tax_inc),

        // 交通（station_name/station_walk は旧フォーマットの互換エイリアス）
        station_line1:  b.station_line1 ? String(b.station_line1) : (b.station_line ? String(b.station_line) : null),
        station_name1:  b.station_name1 ? String(b.station_name1) : (b.station_name ? String(b.station_name) : null),
        station_walk1:  n(b.station_walk1 ?? b.station_walk),
        station_line2:  b.station_line2 ? String(b.station_line2) : null,
        station_name2:  b.station_name2 ? String(b.station_name2) : null,
        station_walk2:  n(b.station_walk2),
        station_line3:  b.station_line3 ? String(b.station_line3) : null,
        station_name3:  b.station_name3 ? String(b.station_name3) : null,
        station_walk3:  n(b.station_walk3),

        // 面積
        area_land_m2:          n(b.area_land_m2),
        area_land_tsubo:       n(b.area_land_tsubo),
        area_build_m2:         n(b.area_build_m2),
        area_build_tsubo:      n(b.area_build_tsubo),
        area_exclusive_m2:     n(b.area_exclusive_m2),
        area_exclusive_tsubo:  n(b.area_exclusive_tsubo),
        area_balcony_m2:       n(b.area_balcony_m2),

        // 建物情報
        rooms:          b.rooms          ? String(b.rooms)          : null,
        building_year:  n(b.building_year),
        building_month: n(b.building_month),
        structure:      b.structure      ? String(b.structure)      : null,
        floors_total:   n(b.floors_total),
        floors_basement: n(b.floors_basement),
        floor_unit:     n(b.floor_unit),
        direction:      b.direction      ? String(b.direction)      : null,
        total_units:    n(b.total_units),

        // 法令・権利
        city_plan:      b.city_plan      ? String(b.city_plan)      : null,
        use_zone:       b.use_zone       ? String(b.use_zone)       : null,
        bcr:            n(b.bcr),
        far:            n(b.far),
        land_right:     b.land_right     ? String(b.land_right)     : null,
        land_category:  b.land_category  ? String(b.land_category)  : null,
        road_side:      b.road_side      ? String(b.road_side)      : null,
        road_width:     n(b.road_width),
        road_type:      b.road_type      ? String(b.road_type)      : null,
        private_road:   bool(b.private_road),
        setback_required: bool(b.setback_required),
        setback_area:   n(b.setback_area),

        // 費用・管理
        management_fee:      n(b.management_fee),
        repair_reserve:      n(b.repair_reserve),
        other_monthly_fee:   n(b.other_monthly_fee),
        land_lease_fee:      n(b.land_lease_fee),
        fixed_asset_tax:     n(b.fixed_asset_tax),
        city_planning_tax:   n(b.city_planning_tax),
        management_type:     b.management_type     ? String(b.management_type)     : null,
        management_company:  b.management_company  ? String(b.management_company)  : null,

        // 引渡し・レインズ
        delivery_timing:  b.delivery_timing  ? String(b.delivery_timing)  : null,
        delivery_status:  b.delivery_status  ? String(b.delivery_status)  : null,
        reins_number:     b.reins_number     ? String(b.reins_number)     : null,

        // 元付業者情報
        seller_company:          b.seller_company          ? String(b.seller_company)          : null,
        seller_contact:          b.seller_contact          ? String(b.seller_contact)          : null,
        seller_agent:            b.seller_agent            ? String(b.seller_agent)            : null,
        seller_fax:              b.seller_fax              ? String(b.seller_fax)              : null,
        seller_transaction_type: b.seller_transaction_type ? String(b.seller_transaction_type) : null,
        seller_brokerage_type:   b.seller_brokerage_type   ? String(b.seller_brokerage_type)   : null,
        ad_transfer_consent:     b.ad_transfer_consent     ? String(b.ad_transfer_consent)     : "あり",

        // 設備
        eq_autolock:        bool(b.eq_autolock ?? b.eq_auto_lock),
        eq_elevator:        bool(b.eq_elevator),
        eq_parking:         bool(b.eq_parking),
        eq_parking_fee:     n(b.eq_parking_fee),
        eq_bike_parking:    bool(b.eq_bike_parking),
        eq_storage:         bool(b.eq_storage),
        eq_pet_ok:          bool(b.eq_pet_ok),
        eq_system_kitchen:  bool(b.eq_system_kitchen),
        eq_all_electric:    bool(b.eq_all_electric),
        eq_floor_heating:   bool(b.eq_floor_heating),
        eq_ac:              bool(b.eq_ac),
        eq_solar:           bool(b.eq_solar ?? b.eq_solar_panel),
        eq_home_security:   bool(b.eq_home_security),
        eq_walk_in_closet:  bool(b.eq_walk_in_closet),
        eq_2f_washroom:     bool(b.eq_2f_washroom),
        eq_washlet:         bool(b.eq_washlet),
        eq_bathroom_dryer:  bool(b.eq_bathroom_dryer),
        eq_tv_intercom:     bool(b.eq_tv_intercom ?? b.eq_monitor_intercom),
        eq_fiber_optic:     bool(b.eq_fiber_optic),
        eq_bs_cs:           bool(b.eq_bs_cs),
        eq_gas_city:        bool(b.eq_gas_city),
        eq_gas_prop:        bool(b.eq_gas_prop),
        eq_water_city:      bool(b.eq_water_city),
        eq_water_well:      bool(b.eq_water_well),
        eq_sewage:          bool(b.eq_sewage),
        eq_septic:          bool(b.eq_septic),
        eq_corner:          bool(b.eq_corner),
        eq_top_floor:       bool(b.eq_top_floor),
        eq_new_interior:    bool(b.eq_new_interior),
        eq_new_exterior:    bool(b.eq_new_exterior),
        eq_reform_kitchen:  bool(b.eq_reform_kitchen),
        eq_reform_bath:     bool(b.eq_reform_bath),

        // 掲載設定（新規登録時はすべてfalse）
        published_hp:      false,
        published_members: false,
        published_suumo:   false,
        published_athome:  false,
        published_yahoo:   false,
        published_homes:   false,
        compliance_checked: false,

        // ポータルID・内部情報
        suumo_id:      b.suumo_id      ? String(b.suumo_id)      : null,
        athome_id:     b.athome_id     ? String(b.athome_id)     : null,
        yahoo_id:      b.yahoo_id      ? String(b.yahoo_id)      : null,
        homes_id:      b.homes_id      ? String(b.homes_id)      : null,
        agent_id:        b.agent_id        ? String(b.agent_id)        : null,
        store_id:        b.store_id        ? String(b.store_id)        : null,
        property_number: propertyNumber,
        internal_memo:   b.internal_memo   ? String(b.internal_memo)   : null,
        tour_url:        b.tour_url        ? String(b.tour_url)        : null,
        source:          b.source          ? String(b.source)          : null,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json({ error: "物件の登録に失敗しました" }, { status: 500 });
  }
}
