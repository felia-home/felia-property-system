"use client";
import React from "react";

export const NUM_FIELDS = new Set([
  "price","price_land","price_build","price_per_m2",
  "station_walk1","station_walk2","station_walk3",
  "area_land_m2","area_land_tsubo","area_build_m2","area_build_tsubo",
  "area_exclusive_m2","area_exclusive_tsubo","area_balcony_m2",
  "building_year","building_month","floors_total","floors_basement","floor_unit","total_units",
  "bcr","far","road_width","setback_area",
  "management_fee","repair_reserve","other_monthly_fee","land_lease_fee",
  "fixed_asset_tax","city_planning_tax","eq_parking_fee",
  "eq_toilet_count","eq_bicycle_count","eq_reform_year","eq_ceiling_height",
]);

export const BOOL_FIELDS = new Set([
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
  "eq_counter_kitchen","eq_cupboard","eq_pantry","eq_touchless_faucet",
  "eq_unit_bath","eq_separate_bath_toilet","eq_double_wash","eq_laundry_space","eq_laundry_outdoor","eq_washlet_all",
  "eq_shoe_closet","eq_trunk_room","eq_roof_storage","eq_all_room_storage",
  "eq_high_insulation","eq_long_quality","eq_zeh","eq_storage_battery","eq_ev_charger","eq_double_glazing","eq_ventilation",
  "eq_crime_prevention_glass","eq_electronic_lock","eq_security_light",
  "eq_parking_roofed","eq_parking_2cars","eq_electric_shutter",
  "eq_floor_heating_all","eq_barrier_free","eq_elevator_private",
  "eq_optical_fiber","eq_cable_tv","eq_interphone_video",
  "eq_terrace","eq_roof_balcony","eq_patio","eq_wood_deck",
  "eq_reformed","eq_renovated","eq_new_kitchen","eq_new_bath","eq_new_toilet","eq_new_floor","eq_new_wall",
  "eq_seismic_isolation","eq_vibration_control",
]);

export const DATE_FIELDS = new Set([
  "reins_registered_at","ad_valid_until",
]);

export const INITIAL_FORM: Record<string, string> = {
  property_type: "USED_HOUSE",
  transaction_type: "仲介",
  brokerage_type: "専任",
  status: "DRAFT",
  prefecture: "東京都",
  city: "",
  address: "",
  address_chiban: "",
  postal_code: "",
  price: "",
  price_land: "",
  price_build: "",
  price_per_m2: "",
  price_tax_inc: "false",
  station_line1: "", station_name1: "", station_walk1: "",
  station_line2: "", station_name2: "", station_walk2: "",
  station_line3: "", station_name3: "", station_walk3: "",
  area_land_m2: "", area_land_tsubo: "",
  area_build_m2: "", area_build_tsubo: "",
  area_exclusive_m2: "", area_exclusive_tsubo: "",
  area_balcony_m2: "",
  rooms: "", building_year: "", building_month: "",
  structure: "", floors_total: "", floors_basement: "",
  floor_unit: "", direction: "", total_units: "",
  city_plan: "", use_zone: "", bcr: "", far: "",
  land_right: "所有権", land_category: "",
  road_side: "", road_width: "", road_type: "",
  private_road: "false", setback_required: "false", setback_area: "",
  management_fee: "", repair_reserve: "", other_monthly_fee: "",
  land_lease_fee: "", fixed_asset_tax: "", city_planning_tax: "",
  management_type: "", management_company: "",
  delivery_timing: "", delivery_status: "空き家",
  reins_number: "", reins_registered_at: "", ad_valid_until: "",
  eq_autolock: "false", eq_elevator: "false", eq_parking: "false",
  eq_parking_fee: "", eq_bike_parking: "false", eq_storage: "false",
  eq_pet_ok: "false", eq_system_kitchen: "false", eq_all_electric: "false",
  eq_floor_heating: "false", eq_ac: "false", eq_solar: "false",
  eq_home_security: "false", eq_walk_in_closet: "false",
  eq_2f_washroom: "false", eq_washlet: "false",
  eq_bathroom_dryer: "false", eq_tv_intercom: "false",
  eq_fiber_optic: "false", eq_bs_cs: "false",
  eq_gas_city: "false", eq_gas_prop: "false",
  eq_water_city: "false", eq_water_well: "false",
  eq_sewage: "false", eq_septic: "false",
  eq_corner: "false", eq_top_floor: "false",
  eq_new_interior: "false", eq_new_exterior: "false",
  eq_reform_kitchen: "false", eq_reform_bath: "false",
  published_hp: "false", published_members: "false",
  published_suumo: "false", published_athome: "false",
  published_yahoo: "false", published_homes: "false",
  compliance_checked: "false",
  suumo_id: "", athome_id: "", yahoo_id: "", homes_id: "",
  agent_id: "", store_id: "", internal_memo: "", source: "",
  title: "", catch_copy: "",
  description_hp: "", description_portal: "",
  description_suumo: "", description_athome: "",
  eq_counter_kitchen:"false", eq_cupboard:"false", eq_pantry:"false", eq_touchless_faucet:"false",
  eq_unit_bath:"false", eq_separate_bath_toilet:"false", eq_double_wash:"false", eq_laundry_space:"false",
  eq_laundry_outdoor:"false", eq_toilet_count:"", eq_washlet_all:"false",
  eq_shoe_closet:"false", eq_trunk_room:"false", eq_roof_storage:"false", eq_all_room_storage:"false",
  eq_high_insulation:"false", eq_long_quality:"false", eq_zeh:"false", eq_storage_battery:"false",
  eq_ev_charger:"false", eq_double_glazing:"false", eq_ventilation:"false",
  eq_crime_prevention_glass:"false", eq_electronic_lock:"false", eq_security_light:"false",
  eq_parking_roofed:"false", eq_parking_2cars:"false", eq_electric_shutter:"false", eq_bicycle_count:"",
  eq_floor_heating_all:"false", eq_ceiling_height:"", eq_barrier_free:"false", eq_elevator_private:"false",
  eq_optical_fiber:"false", eq_cable_tv:"false", eq_interphone_video:"false",
  eq_terrace:"false", eq_roof_balcony:"false", eq_patio:"false", eq_wood_deck:"false",
  eq_reformed:"false", eq_renovated:"false", eq_reform_year:"", eq_new_kitchen:"false",
  eq_new_bath:"false", eq_new_toilet:"false", eq_new_floor:"false", eq_new_wall:"false",
  eq_earthquake_resistant:"", eq_seismic_isolation:"false", eq_vibration_control:"false",
  env_elementary_school:"", env_junior_high_school:"", env_supermarket:"", env_hospital:"",
  env_park:"", env_disaster_risk:"", env_crime_level:"", env_noise_level:"", env_sunlight:"", env_view:"",
};

// Convert a DB property record to form string values
export function propertyToForm(p: Record<string, unknown>): Record<string, string> {
  const form: Record<string, string> = { ...INITIAL_FORM };
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    if (DATE_FIELDS.has(k)) {
      form[k] = v ? new Date(v as string).toISOString().split("T")[0] : "";
    } else if (typeof v === "boolean") {
      form[k] = v ? "true" : "false";
    } else {
      form[k] = String(v);
    }
  }
  return form;
}

// Convert form string values to DB-ready object
export function formToBody(form: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (k === "status") { body[k] = v; continue; }
    if (BOOL_FIELDS.has(k)) { body[k] = v === "true"; continue; }
    if (NUM_FIELDS.has(k)) {
      body[k] = v === "" ? null : Number(v);
      continue;
    }
    if (DATE_FIELDS.has(k)) {
      body[k] = v === "" ? null : v;
      continue;
    }
    body[k] = v === "" ? null : v;
  }
  return body;
}

const inputSt: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 6,
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelSt: React.CSSProperties = {
  fontSize: 11, color: "#706e68", display: "block", marginBottom: 3,
};
const rowSt: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };

function FI({ label, name, form, setForm, type = "text", placeholder }: {
  label: string; name: string; form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={rowSt}>
      <label style={labelSt}>{label}</label>
      <input
        type={type} value={form[name] ?? ""} placeholder={placeholder}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
        style={inputSt}
      />
    </div>
  );
}

function FS({ label, name, form, setForm, options }: {
  label: string; name: string; form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  options: { v: string; l: string }[];
}) {
  return (
    <div style={rowSt}>
      <label style={labelSt}>{label}</label>
      <select value={form[name] ?? ""} onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))} style={inputSt}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function FC({ label, name, form, setForm }: {
  label: string; name: string; form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={form[name] === "true"}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.checked ? "true" : "false" }))}
      />
      {label}
    </label>
  );
}

// m2 + tsubo dual input with auto-conversion
function FM2({ labelM2, labelTsubo, nameM2, nameTsubo, form, setForm }: {
  labelM2: string; labelTsubo: string; nameM2: string; nameTsubo: string;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const handleM2Change = (v: string) => {
    const n = parseFloat(v);
    setForm(f => ({
      ...f,
      [nameM2]: v,
      [nameTsubo]: isNaN(n) ? "" : String(Math.round(n * 0.3025 * 100) / 100),
    }));
  };
  const handleTsuboChange = (v: string) => {
    const n = parseFloat(v);
    setForm(f => ({
      ...f,
      [nameTsubo]: v,
      [nameM2]: isNaN(n) ? "" : String(Math.round(n / 0.3025 * 100) / 100),
    }));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div style={rowSt}>
        <label style={labelSt}>{labelM2}</label>
        <input type="number" value={form[nameM2] ?? ""} onChange={e => handleM2Change(e.target.value)}
          style={inputSt} step="0.01" />
      </div>
      <div style={rowSt}>
        <label style={labelSt}>{labelTsubo}</label>
        <input type="number" value={form[nameTsubo] ?? ""} onChange={e => handleTsuboChange(e.target.value)}
          style={inputSt} step="0.01" />
      </div>
    </div>
  );
}

const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#706e68", letterSpacing: ".06em",
  textTransform: "uppercase", margin: "20px 0 10px", paddingBottom: 6,
  borderBottom: "1px solid #e0deda",
};

const TAB_LABELS = ["基本情報","所在地・交通","面積・建物","法令・権利","設備・仕様","費用・管理","引渡し・レインズ","掲載設定"];

interface TabsProps {
  tab: number;
  setTab: (n: number) => void;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function PropertyFormTabs({ tab, setTab, form, setForm }: TabsProps) {
  const isLand = form.property_type === "LAND";
  const isMansion = form.property_type === "MANSION" || form.property_type === "NEW_MANSION";

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e0deda", marginBottom: 20 }}>
        {TAB_LABELS.map((l, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{
              padding: "10px 16px", fontSize: 12, fontFamily: "inherit",
              border: "none", borderBottom: tab === i ? "2px solid #234f35" : "2px solid transparent",
              background: "none", cursor: "pointer", color: tab === i ? "#234f35" : "#706e68",
              fontWeight: tab === i ? 600 : 400, whiteSpace: "nowrap",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab 0: Basic info */}
      {tab === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FS label="物件種別 *" name="property_type" form={form} setForm={setForm} options={[
              {v:"USED_HOUSE",l:"中古戸建"},{v:"NEW_HOUSE",l:"新築戸建"},
              {v:"MANSION",l:"中古マンション"},{v:"NEW_MANSION",l:"新築マンション"},{v:"LAND",l:"土地"},
            ]} />
            <FS label="取引態様" name="transaction_type" form={form} setForm={setForm} options={[
              {v:"仲介",l:"仲介"},{v:"売主",l:"売主"},{v:"代理",l:"代理"},
            ]} />
            <FS label="媒介契約種別" name="brokerage_type" form={form} setForm={setForm} options={[
              {v:"専任",l:"専任媒介"},{v:"専属専任",l:"専属専任媒介"},{v:"一般",l:"一般媒介"},
            ]} />
          </div>
          <div style={grid3}>
            <FI label="販売価格（万円） *" name="price" form={form} setForm={setForm} type="number" placeholder="8000" />
            <FI label="土地価格（万円）" name="price_land" form={form} setForm={setForm} type="number" />
            <FI label="建物価格（万円）" name="price_build" form={form} setForm={setForm} type="number" />
          </div>
          <div style={grid2}>
            <FI label="タイトル" name="title" form={form} setForm={setForm} placeholder="物件タイトル" />
            <FI label="キャッチコピー" name="catch_copy" form={form} setForm={setForm} placeholder="駅徒歩5分・角地・南向き" />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>HP掲載文</label>
            <textarea value={form.description_hp ?? ""} rows={3}
              onChange={(e) => setForm(f => ({ ...f, description_hp: e.target.value }))}
              style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div style={grid2}>
            <div style={rowSt}>
              <label style={labelSt}>SUUMO掲載文</label>
              <textarea value={form.description_suumo ?? ""} rows={3}
                onChange={(e) => setForm(f => ({ ...f, description_suumo: e.target.value }))}
                style={{ ...inputSt, resize: "vertical" }} />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>athome掲載文</label>
              <textarea value={form.description_athome ?? ""} rows={3}
                onChange={(e) => setForm(f => ({ ...f, description_athome: e.target.value }))}
                style={{ ...inputSt, resize: "vertical" }} />
            </div>
          </div>
          <FI label="担当者ID" name="agent_id" form={form} setForm={setForm} placeholder="agent_001" />
        </div>
      )}

      {/* Tab 1: Location & Transport */}
      {tab === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FI label="郵便番号" name="postal_code" form={form} setForm={setForm} placeholder="150-0001" />
            <FI label="都道府県" name="prefecture" form={form} setForm={setForm} />
            <FI label="市区町村 *" name="city" form={form} setForm={setForm} placeholder="渋谷区" />
          </div>
          <div style={grid2}>
            <FI label="町名・番地" name="address" form={form} setForm={setForm} placeholder="代官山町12-3" />
            <FI label="地番" name="address_chiban" form={form} setForm={setForm} placeholder="地番（登記簿）" />
          </div>
          <div style={sectionTitle}>最寄駅（最大3駅）</div>
          {[1,2,3].map(n => (
            <div key={n} style={grid3}>
              <FI label={`路線${n}`} name={`station_line${n}`} form={form} setForm={setForm} placeholder="東急東横線" />
              <FI label={`駅名${n}`} name={`station_name${n}`} form={form} setForm={setForm} placeholder="代官山" />
              <FI label={`徒歩${n}（分）`} name={`station_walk${n}`} form={form} setForm={setForm} type="number" placeholder="5" />
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Area & Building */}
      {tab === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FM2 labelM2="土地面積（㎡）" labelTsubo="土地面積（坪）" nameM2="area_land_m2" nameTsubo="area_land_tsubo" form={form} setForm={setForm} />
          {!isLand && (
            <FM2 labelM2="建物面積（㎡）" labelTsubo="建物面積（坪）" nameM2="area_build_m2" nameTsubo="area_build_tsubo" form={form} setForm={setForm} />
          )}
          {isMansion && (
            <>
              <FM2 labelM2="専有面積（㎡）" labelTsubo="専有面積（坪）" nameM2="area_exclusive_m2" nameTsubo="area_exclusive_tsubo" form={form} setForm={setForm} />
              <FI label="バルコニー面積（㎡）" name="area_balcony_m2" form={form} setForm={setForm} type="number" />
            </>
          )}
          {!isLand && (
            <>
              <div style={sectionTitle}>建物情報</div>
              <div style={grid3}>
                <FI label="間取り" name="rooms" form={form} setForm={setForm} placeholder="3LDK" />
                <FI label="築年（西暦）" name="building_year" form={form} setForm={setForm} type="number" placeholder="2005" />
                <FI label="築月" name="building_month" form={form} setForm={setForm} type="number" placeholder="3" />
              </div>
              <div style={grid3}>
                <FS label="構造" name="structure" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"木造",l:"木造"},{v:"軽量鉄骨",l:"軽量鉄骨"},
                  {v:"重量鉄骨",l:"重量鉄骨"},{v:"RC",l:"RC（鉄筋コンクリート）"},
                  {v:"SRC",l:"SRC（鉄骨鉄筋コンクリート）"},{v:"その他",l:"その他"},
                ]} />
                <FI label="地上階数" name="floors_total" form={form} setForm={setForm} type="number" />
                <FI label="地下階数" name="floors_basement" form={form} setForm={setForm} type="number" />
              </div>
              <div style={grid3}>
                {isMansion && <FI label="所在階" name="floor_unit" form={form} setForm={setForm} type="number" />}
                <FS label="向き" name="direction" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"南",l:"南"},{v:"南東",l:"南東"},{v:"南西",l:"南西"},
                  {v:"東",l:"東"},{v:"西",l:"西"},{v:"北東",l:"北東"},{v:"北西",l:"北西"},{v:"北",l:"北"},
                ]} />
                {isMansion && <FI label="総戸数" name="total_units" form={form} setForm={setForm} type="number" />}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Legal & Rights */}
      {tab === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FS label="都市計画" name="city_plan" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"市街化区域",l:"市街化区域"},{v:"市街化調整区域",l:"市街化調整区域"},
              {v:"非線引区域",l:"非線引区域"},{v:"準都市計画区域",l:"準都市計画区域"},
            ]} />
            <FS label="用途地域" name="use_zone" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"第一種低層住居専用",l:"第一種低層住居専用"},
              {v:"第二種低層住居専用",l:"第二種低層住居専用"},
              {v:"第一種中高層住居専用",l:"第一種中高層住居専用"},
              {v:"第二種中高層住居専用",l:"第二種中高層住居専用"},
              {v:"第一種住居",l:"第一種住居"},{v:"第二種住居",l:"第二種住居"},
              {v:"準住居",l:"準住居"},{v:"近隣商業",l:"近隣商業"},{v:"商業",l:"商業"},
              {v:"準工業",l:"準工業"},{v:"工業",l:"工業"},{v:"工業専用",l:"工業専用"},
            ]} />
            <FS label="土地権利" name="land_right" form={form} setForm={setForm} options={[
              {v:"所有権",l:"所有権"},{v:"借地権",l:"借地権（地上権）"},{v:"賃借権",l:"借地権（賃借権）"},
            ]} />
          </div>
          <div style={grid3}>
            <FI label="建ぺい率（%）" name="bcr" form={form} setForm={setForm} type="number" placeholder="60" />
            <FI label="容積率（%）" name="far" form={form} setForm={setForm} type="number" placeholder="200" />
            <FI label="地目" name="land_category" form={form} setForm={setForm} placeholder="宅地" />
          </div>
          <div style={sectionTitle}>接道状況</div>
          <div style={grid3}>
            <FI label="接道方向・幅員" name="road_side" form={form} setForm={setForm} placeholder="南側6m" />
            <FI label="前面道路幅員（m）" name="road_width" form={form} setForm={setForm} type="number" />
            <FS label="道路種類" name="road_type" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"公道",l:"公道"},{v:"私道",l:"私道"},{v:"公道・私道",l:"公道・私道"},
            ]} />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <FC label="私道負担あり" name="private_road" form={form} setForm={setForm} />
            <FC label="セットバック要" name="setback_required" form={form} setForm={setForm} />
            {form.setback_required === "true" && (
              <FI label="セットバック面積（㎡）" name="setback_area" form={form} setForm={setForm} type="number" />
            )}
          </div>
        </div>
      )}

      {/* Tab 4: 設備・仕様 */}
      {tab === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* キッチン */}
          <div>
            <div style={sectionTitle}>キッチン</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="システムキッチン" name="eq_system_kitchen" form={form} setForm={setForm} />
              <FC label="対面式キッチン" name="eq_counter_kitchen" form={form} setForm={setForm} />
              <FC label="カップボード" name="eq_cupboard" form={form} setForm={setForm} />
              <FC label="パントリー" name="eq_pantry" form={form} setForm={setForm} />
              <FC label="タッチレス水栓" name="eq_touchless_faucet" form={form} setForm={setForm} />
              <FC label="床暖房" name="eq_floor_heating" form={form} setForm={setForm} />
              <FC label="全室床暖房" name="eq_floor_heating_all" form={form} setForm={setForm} />
            </div>
          </div>
          {/* バス・洗面・トイレ */}
          <div>
            <div style={sectionTitle}>バス・洗面・トイレ</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="ユニットバス" name="eq_unit_bath" form={form} setForm={setForm} />
              <FC label="バス・トイレ別" name="eq_separate_bath_toilet" form={form} setForm={setForm} />
              <FC label="浴室乾燥機" name="eq_bathroom_dryer" form={form} setForm={setForm} />
              <FC label="ダブルボウル洗面" name="eq_double_wash" form={form} setForm={setForm} />
              <FC label="室内洗濯スペース" name="eq_laundry_space" form={form} setForm={setForm} />
              <FC label="屋外洗濯物干し" name="eq_laundry_outdoor" form={form} setForm={setForm} />
              <FC label="温水洗浄便座" name="eq_washlet" form={form} setForm={setForm} />
              <FC label="全室温水洗浄便座" name="eq_washlet_all" form={form} setForm={setForm} />
              <FC label="2F洗面台" name="eq_2f_washroom" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 8, width: "33%" }}>
              <FI label="トイレ数" name="eq_toilet_count" form={form} setForm={setForm} type="number" placeholder="2" />
            </div>
          </div>
          {/* 収納 */}
          <div>
            <div style={sectionTitle}>収納</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="ウォークインクロゼット" name="eq_walk_in_closet" form={form} setForm={setForm} />
              <FC label="シューズクローゼット" name="eq_shoe_closet" form={form} setForm={setForm} />
              <FC label="トランクルーム" name="eq_trunk_room" form={form} setForm={setForm} />
              <FC label="屋根裏収納" name="eq_roof_storage" form={form} setForm={setForm} />
              <FC label="全居室収納あり" name="eq_all_room_storage" form={form} setForm={setForm} />
              <FC label="物置あり" name="eq_storage" form={form} setForm={setForm} />
            </div>
          </div>
          {/* 省エネ・環境 */}
          <div>
            <div style={sectionTitle}>省エネ・環境</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="高気密高断熱" name="eq_high_insulation" form={form} setForm={setForm} />
              <FC label="長期優良住宅" name="eq_long_quality" form={form} setForm={setForm} />
              <FC label="ZEH" name="eq_zeh" form={form} setForm={setForm} />
              <FC label="太陽光発電" name="eq_solar" form={form} setForm={setForm} />
              <FC label="蓄電池" name="eq_storage_battery" form={form} setForm={setForm} />
              <FC label="EV充電設備" name="eq_ev_charger" form={form} setForm={setForm} />
              <FC label="オール電化" name="eq_all_electric" form={form} setForm={setForm} />
              <FC label="複層ガラス" name="eq_double_glazing" form={form} setForm={setForm} />
              <FC label="24時間換気システム" name="eq_ventilation" form={form} setForm={setForm} />
            </div>
          </div>
          {/* セキュリティ */}
          <div>
            <div style={sectionTitle}>セキュリティ</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="オートロック" name="eq_autolock" form={form} setForm={setForm} />
              <FC label="電子錠・スマートロック" name="eq_electronic_lock" form={form} setForm={setForm} />
              <FC label="防犯ガラス" name="eq_crime_prevention_glass" form={form} setForm={setForm} />
              <FC label="センサーライト" name="eq_security_light" form={form} setForm={setForm} />
              <FC label="ホームセキュリティ" name="eq_home_security" form={form} setForm={setForm} />
              <FC label="TVモニタホン" name="eq_tv_intercom" form={form} setForm={setForm} />
            </div>
          </div>
          {/* 駐車・駐輪 */}
          <div>
            <div style={sectionTitle}>駐車・駐輪</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="駐車場あり" name="eq_parking" form={form} setForm={setForm} />
              <FC label="2台以上可" name="eq_parking_2cars" form={form} setForm={setForm} />
              <FC label="屋根付き駐車場" name="eq_parking_roofed" form={form} setForm={setForm} />
              <FC label="電動シャッターガレージ" name="eq_electric_shutter" form={form} setForm={setForm} />
              <FC label="バイク置場" name="eq_bike_parking" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <FI label="駐車場月額（円）" name="eq_parking_fee" form={form} setForm={setForm} type="number" />
              <FI label="駐輪台数" name="eq_bicycle_count" form={form} setForm={setForm} type="number" />
            </div>
          </div>
          {/* 快適性・構造 */}
          <div>
            <div style={sectionTitle}>快適性・構造</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="エアコン付き" name="eq_ac" form={form} setForm={setForm} />
              <FC label="バリアフリー" name="eq_barrier_free" form={form} setForm={setForm} />
              <FC label="ホームエレベーター" name="eq_elevator_private" form={form} setForm={setForm} />
              <FC label="エレベーター（共用）" name="eq_elevator" form={form} setForm={setForm} />
              <FC label="角部屋" name="eq_corner" form={form} setForm={setForm} />
              <FC label="最上階" name="eq_top_floor" form={form} setForm={setForm} />
              <FC label="ペット可" name="eq_pet_ok" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 8, width: "33%" }}>
              <FI label="天井高（m）" name="eq_ceiling_height" form={form} setForm={setForm} type="number" placeholder="2.4" />
            </div>
          </div>
          {/* 通信・AV */}
          <div>
            <div style={sectionTitle}>通信・AV</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="光ファイバー" name="eq_optical_fiber" form={form} setForm={setForm} />
              <FC label="ケーブルTV" name="eq_cable_tv" form={form} setForm={setForm} />
              <FC label="テレビドアホン" name="eq_interphone_video" form={form} setForm={setForm} />
              <FC label="BS・CS対応" name="eq_bs_cs" form={form} setForm={setForm} />
              <FC label="インターネット光ファイバー" name="eq_fiber_optic" form={form} setForm={setForm} />
            </div>
          </div>
          {/* 外構・庭 */}
          <div>
            <div style={sectionTitle}>外構・庭</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="テラス" name="eq_terrace" form={form} setForm={setForm} />
              <FC label="ルーフバルコニー" name="eq_roof_balcony" form={form} setForm={setForm} />
              <FC label="パティオ（中庭）" name="eq_patio" form={form} setForm={setForm} />
              <FC label="ウッドデッキ" name="eq_wood_deck" form={form} setForm={setForm} />
            </div>
          </div>
          {/* リフォーム・リノベ */}
          <div>
            <div style={sectionTitle}>リフォーム・リノベーション</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="内装リフォーム済" name="eq_new_interior" form={form} setForm={setForm} />
              <FC label="外装リフォーム済" name="eq_new_exterior" form={form} setForm={setForm} />
              <FC label="リフォーム済み" name="eq_reformed" form={form} setForm={setForm} />
              <FC label="リノベーション済み" name="eq_renovated" form={form} setForm={setForm} />
              <FC label="キッチン新規交換済" name="eq_new_kitchen" form={form} setForm={setForm} />
              <FC label="バス新規交換済" name="eq_new_bath" form={form} setForm={setForm} />
              <FC label="トイレ新規交換済" name="eq_new_toilet" form={form} setForm={setForm} />
              <FC label="床新規張替済" name="eq_new_floor" form={form} setForm={setForm} />
              <FC label="クロス新規張替済" name="eq_new_wall" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 8, width: "33%" }}>
              <FI label="リフォーム実施年" name="eq_reform_year" form={form} setForm={setForm} type="number" placeholder="2023" />
            </div>
          </div>
          {/* 耐震 */}
          <div>
            <div style={sectionTitle}>耐震</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 }}>
              <FC label="免震構造" name="eq_seismic_isolation" form={form} setForm={setForm} />
              <FC label="制震装置" name="eq_vibration_control" form={form} setForm={setForm} />
            </div>
            <div style={{ width: "50%" }}>
              <FS label="耐震基準" name="eq_earthquake_resistant" form={form} setForm={setForm} options={[
                {v:"",l:"選択"},{v:"新耐震",l:"新耐震（1981年以降）"},{v:"旧耐震",l:"旧耐震（1981年以前）"},
                {v:"耐震補強済み",l:"耐震補強済み"},
              ]} />
            </div>
          </div>
          {/* ガス・水道（既存） */}
          <div>
            <div style={sectionTitle}>ガス・水道・下水</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="都市ガス" name="eq_gas_city" form={form} setForm={setForm} />
              <FC label="プロパンガス" name="eq_gas_prop" form={form} setForm={setForm} />
              <FC label="公営水道" name="eq_water_city" form={form} setForm={setForm} />
              <FC label="井戸水" name="eq_water_well" form={form} setForm={setForm} />
              <FC label="公共下水" name="eq_sewage" form={form} setForm={setForm} />
              <FC label="浄化槽" name="eq_septic" form={form} setForm={setForm} />
            </div>
          </div>
          {/* 周辺環境 */}
          <div>
            <div style={sectionTitle}>周辺環境情報</div>
            <div style={grid2}>
              <FI label="最寄り小学校（名称・距離）" name="env_elementary_school" form={form} setForm={setForm} placeholder="○○小学校 徒歩5分" />
              <FI label="最寄り中学校（名称・距離）" name="env_junior_high_school" form={form} setForm={setForm} placeholder="○○中学校 徒歩8分" />
              <FI label="最寄りスーパー（名称・距離）" name="env_supermarket" form={form} setForm={setForm} placeholder="○○スーパー 徒歩3分" />
              <FI label="最寄り病院（名称・距離）" name="env_hospital" form={form} setForm={setForm} placeholder="○○クリニック 徒歩5分" />
              <FI label="最寄り公園（名称・距離）" name="env_park" form={form} setForm={setForm} placeholder="○○公園 徒歩2分" />
              <FI label="眺望" name="env_view" form={form} setForm={setForm} placeholder="富士山・スカイラインなど" />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={grid2}>
                <FS label="日当たり" name="env_sunlight" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"良好",l:"良好"},{v:"普通",l:"普通"},{v:"やや暗い",l:"やや暗い"},
                ]} />
                <FS label="騒音レベル" name="env_noise_level" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"静か",l:"静か"},{v:"普通",l:"普通"},{v:"やや騒がしい",l:"やや騒がしい"},
                ]} />
              </div>
            </div>
            <div style={{ marginTop: 12, ...rowSt }}>
              <label style={labelSt}>ハザードマップ情報（洪水・土砂・地震）</label>
              <input value={form.env_disaster_risk ?? ""} onChange={(e) => setForm(f => ({ ...f, env_disaster_risk: e.target.value }))}
                placeholder="洪水リスク低・土砂災害区域外" style={inputSt} />
            </div>
            <div style={{ marginTop: 8, ...rowSt }}>
              <label style={labelSt}>治安情報</label>
              <input value={form.env_crime_level ?? ""} onChange={(e) => setForm(f => ({ ...f, env_crime_level: e.target.value }))}
                placeholder="閑静な住宅街・防犯灯整備済み" style={inputSt} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Fees & Management */}
      {tab === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isMansion && (
            <>
              <div style={sectionTitle}>管理費・修繕</div>
              <div style={grid3}>
                <FI label="管理費（月額・円）" name="management_fee" form={form} setForm={setForm} type="number" />
                <FI label="修繕積立金（月額・円）" name="repair_reserve" form={form} setForm={setForm} type="number" />
                <FI label="その他月額費用（円）" name="other_monthly_fee" form={form} setForm={setForm} type="number" />
              </div>
              <div style={grid2}>
                <FS label="管理形態" name="management_type" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"全部委託",l:"全部委託"},{v:"一部委託",l:"一部委託"},
                  {v:"自主管理",l:"自主管理"},
                ]} />
                <FI label="管理会社" name="management_company" form={form} setForm={setForm} />
              </div>
            </>
          )}
          {form.land_right !== "所有権" && (
            <FI label="地代（月額・円）" name="land_lease_fee" form={form} setForm={setForm} type="number" />
          )}
          <div style={sectionTitle}>税金</div>
          <div style={grid2}>
            <FI label="固定資産税（年額・万円）" name="fixed_asset_tax" form={form} setForm={setForm} type="number" />
            <FI label="都市計画税（年額・万円）" name="city_planning_tax" form={form} setForm={setForm} type="number" />
          </div>
        </div>
      )}

      {/* Tab 6: Delivery & REINS */}
      {tab === 6 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FI label="引渡し時期" name="delivery_timing" form={form} setForm={setForm} placeholder="即時・相談" />
            <FS label="現況" name="delivery_status" form={form} setForm={setForm} options={[
              {v:"空き家",l:"空き家"},{v:"居住中",l:"居住中"},{v:"賃貸中",l:"賃貸中"},
              {v:"建築中",l:"建築中"},{v:"その他",l:"その他"},
            ]} />
          </div>
          <div style={sectionTitle}>レインズ</div>
          <div style={grid3}>
            <FI label="レインズ番号" name="reins_number" form={form} setForm={setForm} />
            <FI label="レインズ登録日" name="reins_registered_at" form={form} setForm={setForm} type="date" />
            <FI label="広告有効期限" name="ad_valid_until" form={form} setForm={setForm} type="date" />
          </div>
        </div>
      )}

      {/* Tab 7: Publish settings & internal */}
      {tab === 7 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={sectionTitle}>掲載設定</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <FC label="フェリアホームHP（一般）" name="published_hp" form={form} setForm={setForm} />
              <FC label="フェリアホームHP（会員限定）" name="published_members" form={form} setForm={setForm} />
              <FC label="SUUMO" name="published_suumo" form={form} setForm={setForm} />
              <FC label="athome" name="published_athome" form={form} setForm={setForm} />
              <FC label="Yahoo不動産" name="published_yahoo" form={form} setForm={setForm} />
              <FC label="HOME&apos;S" name="published_homes" form={form} setForm={setForm} />
            </div>
          </div>
          <div>
            <div style={sectionTitle}>ポータルID</div>
            <div style={grid2}>
              <FI label="SUUMO物件ID" name="suumo_id" form={form} setForm={setForm} />
              <FI label="athome物件ID" name="athome_id" form={form} setForm={setForm} />
              <FI label="Yahoo不動産ID" name="yahoo_id" form={form} setForm={setForm} />
              <FI label="HOME&apos;S物件ID" name="homes_id" form={form} setForm={setForm} />
            </div>
          </div>
          <div>
            <div style={sectionTitle}>内部情報</div>
            <div style={grid3}>
              <FI label="ストアID" name="store_id" form={form} setForm={setForm} />
              <FI label="仕入れ経路" name="source" form={form} setForm={setForm} placeholder="売主直接・業者紹介等" />
              <FC label="コンプライアンス確認済" name="compliance_checked" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 12, ...rowSt }}>
              <label style={labelSt}>社内メモ（非公開）</label>
              <textarea value={form.internal_memo ?? ""} rows={4}
                onChange={(e) => setForm(f => ({ ...f, internal_memo: e.target.value }))}
                style={{ ...inputSt, resize: "vertical" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
