"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { getTownsByCity } from "@/lib/tokyo-towns";
import { TOKYO_WARDS, TOKYO_CITIES, TOKYO_TRAIN_LINES, USE_ZONE_OPTIONS, USE_ZONE_DEFAULTS, ROAD_DIRECTIONS } from "@/lib/master-data";

// ── Numeric fields (stored as numbers, not strings) ──────────────────────────
export const NUM_FIELDS = new Set([
  "price","price_land","price_build","price_per_m2","purchase_price",
  "station_walk1","station_walk2","station_walk3",
  "bus_time1","bus_time2","bus_time3",
  "area_land_m2","area_land_tsubo","area_build_m2","area_build_tsubo",
  "area_exclusive_m2","area_exclusive_tsubo","area_balcony_m2",
  "building_year","building_month","floors_total","floors_basement","floor_unit","total_units",
  "rooms_count","ldk_size",
  "bcr","far","road_width","setback_area",
  "management_fee","repair_reserve","other_monthly_fee","land_lease_fee",
  "fixed_asset_tax","city_planning_tax","eq_parking_fee",
  "eq_toilet_count","eq_bicycle_count","eq_reform_year","eq_ceiling_height",
  "latitude","longitude",
]);

// ── Boolean fields ────────────────────────────────────────────────────────────
export const BOOL_FIELDS = new Set([
  "price_tax_inc","price_negotiable",
  "private_road","setback_required",
  "building_conditions","national_land_act","agricultural_act","landscape_act",
  // equipment
  "eq_autolock","eq_elevator","eq_parking","eq_bike_parking","eq_storage",
  "eq_pet_ok","eq_system_kitchen","eq_all_electric","eq_floor_heating","eq_ac",
  "eq_solar","eq_home_security","eq_walk_in_closet","eq_2f_washroom","eq_washlet",
  "eq_bathroom_dryer","eq_tv_intercom","eq_fiber_optic","eq_bs_cs",
  "eq_gas_city","eq_gas_prop","eq_water_city","eq_water_well",
  "eq_sewage","eq_septic","eq_corner","eq_top_floor",
  "eq_new_interior","eq_new_exterior","eq_reform_kitchen","eq_reform_bath",
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
  // publish
  "published_hp","published_members","published_suumo","published_athome",
  "published_yahoo","published_homes","compliance_checked",
]);

// ── Date fields ───────────────────────────────────────────────────────────────
export const DATE_FIELDS = new Set([
  "reins_registered_at","reins_updated_at","ad_valid_until","purchase_date",
]);

// ── Default form values ───────────────────────────────────────────────────────
export const INITIAL_FORM: Record<string, string> = {
  // タブ1: 基本
  property_type: "USED_HOUSE",
  transaction_type: "仲介",
  brokerage_type: "専任",
  status: "DRAFT",
  price: "", price_land: "", price_build: "", price_per_m2: "",
  price_tax_inc: "false", price_negotiable: "false",
  ad_transfer_consent: "あり",
  title: "", catch_copy: "",
  description_hp: "", description_portal: "", description_suumo: "", description_athome: "",
  agent_id: "",
  // タブ2: 売主
  seller_company: "", seller_contact: "", seller_agent: "",
  seller_transaction_type: "", seller_brokerage_type: "",
  purchase_price: "", purchase_date: "",
  internal_memo: "", source: "", store_id: "", property_number: "",
  // タブ3: 所在地
  address_display_level: "town",
  address_display_custom: "",
  prefecture: "東京都", city: "", town: "", address: "",
  address_chiban: "", postal_code: "", building_name: "", room_number: "",
  latitude: "", longitude: "",
  station_line1: "", station_name1: "", station_walk1: "",
  bus_stop1: "", bus_time1: "",
  station_line2: "", station_name2: "", station_walk2: "",
  bus_stop2: "", bus_time2: "",
  station_line3: "", station_name3: "", station_walk3: "",
  bus_stop3: "", bus_time3: "",
  // タブ4: 面積・建物
  area_land_m2: "", area_land_tsubo: "",
  area_build_m2: "", area_build_tsubo: "",
  area_exclusive_m2: "", area_exclusive_tsubo: "",
  area_balcony_m2: "",
  land_right: "所有権", land_category: "",
  building_year: "", building_month: "", structure: "",
  floors_total: "", floors_basement: "", floor_unit: "",
  direction: "", rooms: "", rooms_count: "", ldk_size: "",
  eq_ceiling_height: "", total_units: "",
  // タブ5: 法令・権利
  city_plan: "", use_zone: "", use_zones: "[]", bcr: "", far: "",
  road_side: "", road_width: "", road_type: "", road_direction: "", road_contact: "",
  roads: "[]",
  private_road: "false", setback_required: "false", setback_area: "",
  building_conditions: "false", rebuild_allowed: "",
  national_land_act: "false", agricultural_act: "false", landscape_act: "false",
  // タブ6: 設備
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
  eq_counter_kitchen: "false", eq_cupboard: "false", eq_pantry: "false", eq_touchless_faucet: "false",
  eq_unit_bath: "false", eq_separate_bath_toilet: "false", eq_double_wash: "false",
  eq_laundry_space: "false", eq_laundry_outdoor: "false",
  eq_toilet_count: "", eq_washlet_all: "false",
  eq_shoe_closet: "false", eq_trunk_room: "false", eq_roof_storage: "false", eq_all_room_storage: "false",
  eq_high_insulation: "false", eq_long_quality: "false", eq_zeh: "false",
  eq_storage_battery: "false", eq_ev_charger: "false", eq_double_glazing: "false", eq_ventilation: "false",
  eq_crime_prevention_glass: "false", eq_electronic_lock: "false", eq_security_light: "false",
  eq_parking_roofed: "false", eq_parking_2cars: "false", eq_electric_shutter: "false", eq_bicycle_count: "",
  eq_floor_heating_all: "false", eq_barrier_free: "false", eq_elevator_private: "false",
  eq_optical_fiber: "false", eq_cable_tv: "false", eq_interphone_video: "false",
  eq_terrace: "false", eq_roof_balcony: "false", eq_patio: "false", eq_wood_deck: "false",
  eq_reformed: "false", eq_renovated: "false", eq_reform_year: "",
  eq_new_kitchen: "false", eq_new_bath: "false", eq_new_toilet: "false",
  eq_new_floor: "false", eq_new_wall: "false",
  eq_earthquake_resistant: "", eq_seismic_isolation: "false", eq_vibration_control: "false",
  // タブ7: マンション・費用
  management_fee: "", repair_reserve: "", other_monthly_fee: "",
  management_type: "", management_company: "",
  land_lease_fee: "", fixed_asset_tax: "", city_planning_tax: "",
  // タブ8: 引渡し・レインズ・掲載
  delivery_timing: "", delivery_condition: "", delivery_status: "空き家",
  reins_number: "", reins_registered_at: "", reins_updated_at: "", reins_status: "",
  ad_valid_until: "",
  published_hp: "false", published_members: "false",
  published_suumo: "false", published_athome: "false",
  published_yahoo: "false", published_homes: "false",
  suumo_id: "", athome_id: "", yahoo_id: "", homes_id: "",
  compliance_checked: "false",
  // タブ9: 周辺環境
  env_elementary_school: "", env_junior_high_school: "",
  env_supermarket: "", env_hospital: "", env_park: "",
  env_disaster_risk: "", env_crime_level: "",
  env_noise_level: "", env_sunlight: "", env_view: "",
};

// ── DB → form converter ────────────────────────────────────────────────────────
export function propertyToForm(p: Record<string, unknown>): Record<string, string> {
  const form: Record<string, string> = { ...INITIAL_FORM };
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    if (k === "use_zones" || k === "roads") {
      form[k] = Array.isArray(v) ? JSON.stringify(v) : "[]";
    } else if (DATE_FIELDS.has(k)) {
      form[k] = v ? new Date(v as string).toISOString().split("T")[0] : "";
    } else if (typeof v === "boolean") {
      form[k] = v ? "true" : "false";
    } else {
      form[k] = String(v);
    }
  }
  return form;
}

// ── form → body converter ──────────────────────────────────────────────────────
export function formToBody(form: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (k === "status") { body[k] = v; continue; }
    if (k === "use_zones" || k === "roads") {
      try { const arr = JSON.parse(v); body[k] = Array.isArray(arr) && arr.length > 0 ? arr : null; }
      catch { body[k] = null; }
      continue;
    }
    if (BOOL_FIELDS.has(k)) { body[k] = v === "true"; continue; }
    if (NUM_FIELDS.has(k)) { body[k] = v === "" ? null : Number(v); continue; }
    if (DATE_FIELDS.has(k)) { body[k] = v === "" ? null : v; continue; }
    body[k] = v === "" ? null : v;
  }
  return body;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 6,
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelSt: React.CSSProperties = { fontSize: 11, color: "#706e68", display: "block", marginBottom: 3 };
const rowSt: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#706e68", letterSpacing: ".06em",
  textTransform: "uppercase" as const, margin: "18px 0 10px",
  paddingBottom: 6, borderBottom: "1px solid #e0deda",
};
const warningBox: React.CSSProperties = {
  background: "#fdeaea", border: "1px solid #f5c6c6", borderRadius: 8,
  padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#8c1f1f", fontWeight: 500,
};

// ── Form primitives ───────────────────────────────────────────────────────────
type SetForm = React.Dispatch<React.SetStateAction<Record<string, string>>>;

function FI({ label, name, form, setForm, type = "text", placeholder, disabled }: {
  label: string; name: string; form: Record<string, string>; setForm: SetForm;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div style={rowSt}>
      <label style={labelSt}>{label}</label>
      <input type={type} value={form[name] ?? ""} placeholder={placeholder} disabled={disabled}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
        style={{ ...inputSt, background: disabled ? "#f7f6f2" : "#fff" }} />
    </div>
  );
}

function FS({ label, name, form, setForm, options }: {
  label: string; name: string; form: Record<string, string>; setForm: SetForm;
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
  label: string; name: string; form: Record<string, string>; setForm: SetForm;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
      <input type="checkbox" checked={form[name] === "true"}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.checked ? "true" : "false" }))} />
      {label}
    </label>
  );
}

function FM2({ labelM2, labelTsubo, nameM2, nameTsubo, form, setForm }: {
  labelM2: string; labelTsubo: string; nameM2: string; nameTsubo: string;
  form: Record<string, string>; setForm: SetForm;
}) {
  const handleM2 = (v: string) => {
    const n = parseFloat(v);
    setForm(f => ({ ...f, [nameM2]: v, [nameTsubo]: isNaN(n) ? "" : String(Math.round(n * 0.3025 * 100) / 100) }));
  };
  const handleTsubo = (v: string) => {
    const n = parseFloat(v);
    setForm(f => ({ ...f, [nameTsubo]: v, [nameM2]: isNaN(n) ? "" : String(Math.round(n / 0.3025 * 100) / 100) }));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div style={rowSt}>
        <label style={labelSt}>{labelM2}</label>
        <input type="number" value={form[nameM2] ?? ""} onChange={e => handleM2(e.target.value)} style={inputSt} step="0.01" />
      </div>
      <div style={rowSt}>
        <label style={labelSt}>{labelTsubo}</label>
        <input type="number" value={form[nameTsubo] ?? ""} onChange={e => handleTsubo(e.target.value)} style={inputSt} step="0.01" />
      </div>
    </div>
  );
}

// ── CitySelect ────────────────────────────────────────────────────────────────
// Tokyo 23 wards + 市部 in grouped select; switches to free-text for other prefectures
function CitySelect({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const city = form.city ?? "";
  const isCustom =
    city !== "" &&
    !TOKYO_WARDS.includes(city as typeof TOKYO_WARDS[number]) &&
    !TOKYO_CITIES.includes(city as typeof TOKYO_CITIES[number]);
  const [custom, setCustom] = useState(isCustom);

  const handleSelect = (v: string) => {
    if (v === "__custom__") { setCustom(true); setForm(f => ({ ...f, city: "" })); return; }
    setCustom(false);
    setForm(f => ({ ...f, city: v }));
  };

  return (
    <div style={rowSt}>
      <label style={labelSt}>市区町村 *</label>
      {!custom ? (
        <select value={city} onChange={e => handleSelect(e.target.value)} style={inputSt}>
          <option value="">選択してください</option>
          <optgroup label="東京23区">
            {TOKYO_WARDS.map(w => <option key={w} value={w}>{w}</option>)}
          </optgroup>
          <optgroup label="東京市部">
            {TOKYO_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </optgroup>
          <optgroup label="その他">
            <option value="__custom__">直接入力（他道府県・市区町村）</option>
          </optgroup>
        </select>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="市区町村名を入力"
            style={{ ...inputSt, flex: 1 }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => { setCustom(false); setForm(f => ({ ...f, city: "" })); }}
            style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #e0deda", borderRadius: 6, background: "#f7f6f2", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >リストに戻る</button>
        </div>
      )}
    </div>
  );
}

// ── PostalInput ───────────────────────────────────────────────────────────────
// 郵便番号入力 → 住所自動補完
function PostalInput({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const [loading, setLoading] = useState(false);
  const [hit, setHit] = useState(false);

  const lookup = async (code: string) => {
    const clean = code.replace(/-/g, "");
    if (clean.length !== 7) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/address-suggest?postal=${clean}`);
      const data = await res.json() as { result: { prefecture: string; city: string; town: string } | null };
      if (data.result) {
        setForm(f => ({
          ...f,
          prefecture: data.result!.prefecture,
          city: data.result!.city,
          town: data.result!.town,
        }));
        setHit(true);
        setTimeout(() => setHit(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={rowSt}>
      <label style={labelSt}>
        郵便番号
        {loading && <span style={{ marginLeft: 6, fontSize: 10, color: "#706e68" }}>検索中...</span>}
        {hit && <span style={{ marginLeft: 6, fontSize: 10, color: "#234f35" }}>✓ 住所を自動補完しました</span>}
      </label>
      <input
        type="text"
        value={form.postal_code ?? ""}
        placeholder="150-0033"
        maxLength={8}
        onChange={e => {
          const v = e.target.value;
          setForm(f => ({ ...f, postal_code: v }));
          const clean = v.replace(/-/g, "");
          if (clean.length === 7) lookup(v);
        }}
        style={inputSt}
      />
    </div>
  );
}

// ── TownInput ─────────────────────────────────────────────────────────────────
// コンボボックス: 区→静的候補を表示しつつフリーテキスト入力も可能
// その他→Nominatim候補表示
function TownInput({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const city = form.city ?? "";
  const staticTowns = getTownsByCity(city);
  const isWard = staticTowns.length > 0;

  const [nominatimSuggestions, setNominatimSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputVal = form.town ?? "";

  // Filtered static candidates: prefix match first, then substring
  const filteredStatic = useMemo(() => {
    if (!isWard) return [];
    if (!inputVal) return staticTowns.slice(0, 15);
    const prefix = staticTowns.filter(t => t.startsWith(inputVal));
    const sub = staticTowns.filter(t => !t.startsWith(inputVal) && t.includes(inputVal));
    return [...prefix, ...sub].slice(0, 15);
  }, [isWard, inputVal, staticTowns]);

  // Clear suggestions when city changes (do NOT clear the town text)
  useEffect(() => {
    setNominatimSuggestions([]);
    setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const searchNominatim = useCallback(async (q: string) => {
    if (!q || !city || isWard) { setNominatimSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/address-suggest?city=${encodeURIComponent(city)}&town=${encodeURIComponent(q)}`);
    const data = await res.json() as { towns: string[] };
    setNominatimSuggestions(data.towns ?? []);
    setOpen((data.towns?.length ?? 0) > 0);
  }, [city, isWard]);

  const handleChange = (v: string) => {
    setForm(f => ({ ...f, town: v }));
    setOpen(true);
    if (!isWard) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => searchNominatim(v), 350);
    }
  };

  const candidates = isWard ? filteredStatic : nominatimSuggestions;

  return (
    <div style={{ ...rowSt, position: "relative" }}>
      <label style={labelSt}>町名・丁目（表示用）</label>
      <input
        type="text"
        value={inputVal}
        placeholder="代官山町"
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (filteredStatic.length > 0 || nominatimSuggestions.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === "Enter") { setOpen(false); } }}
        style={inputSt}
      />
      {isWard && (
        <div style={{ fontSize: 10, color: "#999", marginTop: 3 }}>
          ※リストにない場合はそのまま入力できます
        </div>
      )}
      {open && candidates.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 30,
          background: "#fff", border: "1px solid #e0deda", borderRadius: 7,
          boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 200, overflowY: "auto",
        }}>
          {candidates.map(s => (
            <button key={s} type="button"
              onClick={() => { setForm(f => ({ ...f, town: s })); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", borderBottom: "1px solid #f2f1ed" }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LineInput ─────────────────────────────────────────────────────────────────
// 路線名入力 with datalist オートコンプリート
function LineInput({ name, form, setForm }: { name: string; form: Record<string, string>; setForm: SetForm }) {
  const listId = `lines_${name}`;
  return (
    <div style={rowSt}>
      <label style={labelSt}>路線</label>
      <input
        type="text"
        list={listId}
        value={form[name] ?? ""}
        placeholder="東急東横線"
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        style={inputSt}
      />
      <datalist id={listId}>
        {TOKYO_TRAIN_LINES.map(l => <option key={l} value={l} />)}
      </datalist>
    </div>
  );
}

// ── UseZoneEditor ─────────────────────────────────────────────────────────────
interface UseZoneRow { zone: string; bcr: string; far: string; area_pct: string }

function UseZoneEditor({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const parseRows = (): UseZoneRow[] => {
    try { const v = JSON.parse(form.use_zones ?? "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  const rows = parseRows();

  const sync = (next: UseZoneRow[]) =>
    setForm(f => ({ ...f, use_zones: JSON.stringify(next) }));

  const addRow = () => sync([...rows, { zone: "", bcr: "", far: "", area_pct: "" }]);
  const removeRow = (i: number) => sync(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof UseZoneRow, val: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    // Auto-fill BCR/FAR defaults when zone is selected
    if (field === "zone" && val && !next[i].bcr && !next[i].far) {
      const def = USE_ZONE_DEFAULTS[val];
      if (def) { next[i].bcr = String(def.bcr); next[i].far = String(def.far); }
    }
    sync(next);
    // Also update single-value fields from first row
    if (next[0]) {
      setForm(f => ({
        ...f,
        use_zones: JSON.stringify(next),
        use_zone: next[0].zone || f.use_zone,
        bcr: next[0].bcr || f.bcr,
        far: next[0].far || f.far,
      }));
    }
  };

  // Calculate weighted BCR / FAR
  const hasMultiple = rows.length >= 2;
  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.area_pct) || 0), 0);
  const calcBCR = hasMultiple && totalPct > 0
    ? rows.reduce((s, r) => s + (parseFloat(r.bcr) || 0) * ((parseFloat(r.area_pct) || 0) / totalPct), 0)
    : null;
  const calcFAR = hasMultiple && totalPct > 0
    ? rows.reduce((s, r) => s + (parseFloat(r.far) || 0) * ((parseFloat(r.area_pct) || 0) / totalPct), 0)
    : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={labelSt}>用途地域</label>
        <button type="button" onClick={addRow}
          style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #234f35", borderRadius: 5, background: "#f0f7f2", color: "#234f35", cursor: "pointer", fontFamily: "inherit" }}>
          ＋ 追加
        </button>
      </div>

      {rows.length === 0 && (
        <button type="button" onClick={addRow}
          style={{ width: "100%", padding: "8px", border: "2px dashed #d0cec8", borderRadius: 7, background: "none", color: "#706e68", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          用途地域を追加
        </button>
      )}

      {rows.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 80px 28px", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>地域種別</label>}
            <select value={row.zone} onChange={e => updateRow(i, "zone", e.target.value)} style={inputSt}>
              <option value="">選択</option>
              {USE_ZONE_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>建ぺい率%</label>}
            <input type="number" value={row.bcr} onChange={e => updateRow(i, "bcr", e.target.value)} placeholder="60" style={inputSt} />
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>容積率%</label>}
            <input type="number" value={row.far} onChange={e => updateRow(i, "far", e.target.value)} placeholder="200" style={inputSt} />
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>面積割合%</label>}
            <input type="number" value={row.area_pct} onChange={e => updateRow(i, "area_pct", e.target.value)} placeholder="70" style={inputSt} />
          </div>
          <button type="button" onClick={() => removeRow(i)}
            style={{ padding: "5px 6px", border: "1px solid #f5c6c6", borderRadius: 5, background: "#fdeaea", color: "#8c1f1f", cursor: "pointer", fontSize: 12, fontFamily: "inherit", alignSelf: "flex-end" }}>
            ✕
          </button>
        </div>
      ))}

      {hasMultiple && calcBCR !== null && calcFAR !== null && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0f7f2", borderRadius: 7, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: "#234f35" }}>按分計算値：</span>
          <span style={{ marginLeft: 8 }}>建ぺい率 <b>{calcBCR.toFixed(1)}%</b></span>
          <span style={{ marginLeft: 12 }}>容積率 <b>{calcFAR.toFixed(1)}%</b></span>
          {Math.abs(totalPct - 100) > 1 && (
            <span style={{ marginLeft: 12, color: "#8a5200" }}>⚠ 面積割合の合計が{totalPct}%（100%に調整してください）</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── RoadEditor ────────────────────────────────────────────────────────────────
interface RoadRow { direction: string; width: string; type: string; contact: string }

function RoadEditor({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const parseRows = (): RoadRow[] => {
    try { const v = JSON.parse(form.roads ?? "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  const rows = parseRows();

  const sync = (next: RoadRow[]) =>
    setForm(f => ({ ...f, roads: JSON.stringify(next) }));

  const addRow = () => sync([...rows, { direction: "", width: "", type: "公道", contact: "" }]);
  const removeRow = (i: number) => sync(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof RoadRow, val: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    sync(next);
    // Mirror first road into legacy single fields
    if (next[0]) {
      setForm(f => ({
        ...f,
        roads: JSON.stringify(next),
        road_direction: next[0].direction || f.road_direction,
        road_width: next[0].width || f.road_width,
        road_type: next[0].type || f.road_type,
        road_contact: next[0].contact || f.road_contact,
      }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={labelSt}>接道状況</label>
        <button type="button" onClick={addRow}
          style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #234f35", borderRadius: 5, background: "#f0f7f2", color: "#234f35", cursor: "pointer", fontFamily: "inherit" }}>
          ＋ 接道を追加
        </button>
      </div>

      {rows.length === 0 && (
        <button type="button" onClick={addRow}
          style={{ width: "100%", padding: "8px", border: "2px dashed #d0cec8", borderRadius: 7, background: "none", color: "#706e68", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          接道を追加
        </button>
      )}

      {rows.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 80px 100px 1fr 28px", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>方向</label>}
            <select value={row.direction} onChange={e => updateRow(i, "direction", e.target.value)} style={inputSt}>
              <option value="">選択</option>
              {ROAD_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>幅員(m)</label>}
            <input type="number" step="0.1" value={row.width} onChange={e => updateRow(i, "width", e.target.value)} placeholder="6.0" style={inputSt} />
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>道路種類</label>}
            <select value={row.type} onChange={e => updateRow(i, "type", e.target.value)} style={inputSt}>
              <option value="公道">公道</option>
              <option value="私道">私道</option>
              <option value="公道・私道">公道・私道</option>
            </select>
          </div>
          <div style={rowSt}>
            {i === 0 && <label style={labelSt}>接道状況・備考</label>}
            <input type="text" value={row.contact} onChange={e => updateRow(i, "contact", e.target.value)} placeholder="南側6m公道に接道" style={inputSt} />
          </div>
          <button type="button" onClick={() => removeRow(i)}
            style={{ padding: "5px 6px", border: "1px solid #f5c6c6", borderRadius: 5, background: "#fdeaea", color: "#8c1f1f", cursor: "pointer", fontSize: 12, fontFamily: "inherit", alignSelf: "flex-end" }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── StoreStaffSelector ────────────────────────────────────────────────────────
interface StoreOpt { id: string; name: string; store_code: string }
interface StaffOpt { id: string; name: string; store_id: string }

function StoreStaffSelector({ form, setForm }: { form: Record<string, string>; setForm: SetForm }) {
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const [allStaff, setAllStaff] = useState<StaffOpt[]>([]);
  const [propNumPreview, setPropNumPreview] = useState<string>("");

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then((d: { stores: StoreOpt[] }) => setStores(d.stores ?? [])).catch(() => {});
    fetch("/api/staff").then(r => r.json()).then((d: { staff: StaffOpt[] }) => setAllStaff(d.staff ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.store_id) { setPropNumPreview(""); return; }
    fetch(`/api/property-number?store_id=${form.store_id}`)
      .then(r => r.json())
      .then((d: { preview: string }) => setPropNumPreview(d.preview ?? ""))
      .catch(() => setPropNumPreview(""));
  }, [form.store_id]);

  const filteredStaff = form.store_id ? allStaff.filter(s => s.store_id === form.store_id) : allStaff;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#5a4a3a", marginBottom: 4 }}>担当店舗・スタッフ</div>
      <div style={grid3}>
        <div style={rowSt}>
          <label style={labelSt}>担当店舗</label>
          <select
            value={form.store_id ?? ""}
            onChange={e => setForm(f => ({ ...f, store_id: e.target.value, agent_id: "" }))}
            style={inputSt}
          >
            <option value="">選択してください</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}（{s.store_code}）</option>)}
          </select>
        </div>
        <div style={rowSt}>
          <label style={labelSt}>担当スタッフ</label>
          <select
            value={form.agent_id ?? ""}
            onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
            style={inputSt}
            disabled={filteredStaff.length === 0}
          >
            <option value="">選択してください</option>
            {filteredStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={rowSt}>
          <label style={labelSt}>物件番号プレビュー</label>
          <div style={{ ...inputSt, background: "#f8f6f3", color: propNumPreview ? "#3a2a1a" : "#aaa", display: "flex", alignItems: "center", fontSize: 13, fontFamily: "monospace" }}>
            {propNumPreview || "店舗を選択すると表示されます"}
          </div>
          {form.property_number && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>現在: {form.property_number}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab labels ────────────────────────────────────────────────────────────────
const TAB_LABELS = [
  "基本・取引","売主情報","所在地・交通","面積・建物","法令・権利",
  "設備・仕様","マンション・費用","引渡し・掲載","地図・周辺環境",
];

// ── Main component ────────────────────────────────────────────────────────────
interface TabsProps {
  tab: number;
  setTab: (n: number) => void;
  form: Record<string, string>;
  setForm: SetForm;
  onGenerateContent?: () => void;
  generatingContent?: boolean;
}

export function PropertyFormTabs({ tab, setTab, form, setForm, onGenerateContent, generatingContent }: TabsProps) {
  const isLand = form.property_type === "LAND";
  const isMansion = form.property_type === "MANSION" || form.property_type === "NEW_MANSION";

  const handleGeocode = async () => {
    const addr = [form.prefecture, form.city, form.town, form.address].filter(Boolean).join("");
    if (!addr) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
      const res = await fetch(url);
      const data = await res.json() as Array<{ lat: string; lon: string }>;
      if (data[0]) {
        setForm(f => ({ ...f, latitude: String(parseFloat(data[0].lat).toFixed(6)), longitude: String(parseFloat(data[0].lon).toFixed(6)) }));
      }
    } catch { /* ignore */ }
  };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e0deda", marginBottom: 20, flexWrap: "wrap" }}>
        {TAB_LABELS.map((l, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: "10px 14px", fontSize: 11, fontFamily: "inherit",
            border: "none", borderBottom: tab === i ? "2px solid #234f35" : "2px solid transparent",
            background: "none", cursor: "pointer", color: tab === i ? "#234f35" : "#706e68",
            fontWeight: tab === i ? 600 : 400, whiteSpace: "nowrap",
          }}>{l}</button>
        ))}
      </div>

      {/* ── Tab 0: 基本・取引情報 ── */}
      {tab === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FS label="物件種別 *" name="property_type" form={form} setForm={setForm} options={[
              {v:"USED_HOUSE",l:"中古戸建"},{v:"NEW_HOUSE",l:"新築戸建"},
              {v:"MANSION",l:"中古マンション"},{v:"NEW_MANSION",l:"新築マンション"},{v:"LAND",l:"土地"},
            ]} />
            <FS label="取引態様（フェリアホーム） *" name="transaction_type" form={form} setForm={setForm} options={[
              {v:"仲介",l:"仲介"},{v:"売主",l:"売主"},{v:"代理",l:"代理"},
            ]} />
            <FS label="媒介種別" name="brokerage_type" form={form} setForm={setForm} options={[
              {v:"専任",l:"専任媒介"},{v:"専属専任",l:"専属専任媒介"},{v:"一般",l:"一般媒介"},
            ]} />
          </div>
          <div style={grid3}>
            <FI label="販売価格（万円） *" name="price" form={form} setForm={setForm} type="number" placeholder="8000" />
            <FI label="土地価格（万円）" name="price_land" form={form} setForm={setForm} type="number" />
            <FI label="建物価格（万円）" name="price_build" form={form} setForm={setForm} type="number" />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <FC label="価格応相談" name="price_negotiable" form={form} setForm={setForm} />
            <FC label="消費税込み" name="price_tax_inc" form={form} setForm={setForm} />
            <FS label="広告転載承諾" name="ad_transfer_consent" form={form} setForm={setForm} options={[
              {v:"あり",l:"あり"},{v:"なし",l:"なし"},
            ]} />
          </div>
        </div>
      )}

      {/* ── Tab 1: 売主情報（内部管理・非公開） ── */}
      {tab === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={warningBox}>
            このタブの情報はHP・ポータルに掲載されません。内部管理専用です。
          </div>
          <div style={grid3}>
            <FI label="売主・元付業者名" name="seller_company" form={form} setForm={setForm} placeholder="○○不動産株式会社" />
            <FI label="売主担当者名" name="seller_agent" form={form} setForm={setForm} placeholder="山田太郎" />
            <FI label="連絡先（電話・メール）" name="seller_contact" form={form} setForm={setForm} placeholder="03-XXXX-XXXX" />
          </div>
          <div style={grid3}>
            <FS label="販売図面の取引態様（元付）" name="seller_transaction_type" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"仲介",l:"仲介"},{v:"売主",l:"売主"},{v:"代理",l:"代理"},
            ]} />
            <FS label="媒介種別（元付）" name="seller_brokerage_type" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"専任",l:"専任媒介"},{v:"専属専任",l:"専属専任媒介"},{v:"一般",l:"一般媒介"},
            ]} />
          </div>
          <div style={grid3}>
            <FI label="仕入れ価格（万円）" name="purchase_price" form={form} setForm={setForm} type="number" />
            <FI label="仕入れ日" name="purchase_date" form={form} setForm={setForm} type="date" />
            <FI label="仕入れ経路" name="source" form={form} setForm={setForm} placeholder="売主直接・業者紹介等" />
          </div>
          <StoreStaffSelector form={form} setForm={setForm} />
          <div style={rowSt}>
            <label style={labelSt}>社内メモ（非公開）</label>
            <textarea value={form.internal_memo ?? ""} rows={5}
              onChange={(e) => setForm(f => ({ ...f, internal_memo: e.target.value }))}
              style={{ ...inputSt, resize: "vertical" }} />
          </div>
        </div>
      )}

      {/* ── Tab 2: 所在地・交通 ── */}
      {tab === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={sectionTitle}>住所表示設定</div>
          <div style={grid3}>
            <FS label="公開時の表示レベル" name="address_display_level" form={form} setForm={setForm} options={[
              {v:"town",l:"丁目まで表示（推奨）"},
              {v:"city",l:"市区町村のみ"},
              {v:"custom",l:"カスタム表示"},
            ]} />
            {form.address_display_level === "custom" && (
              <FI label="カスタム表示住所" name="address_display_custom" form={form} setForm={setForm} placeholder="渋谷区代官山エリア" />
            )}
          </div>
          <div style={sectionTitle}>所在地</div>
          <div style={grid3}>
            <PostalInput form={form} setForm={setForm} />
            <FI label="都道府県" name="prefecture" form={form} setForm={setForm} />
            <CitySelect form={form} setForm={setForm} />
          </div>
          <div style={grid3}>
            <TownInput form={form} setForm={setForm} />
            <div style={rowSt}>
              <label style={labelSt}>番地以降 <span style={{ color: "#8c1f1f", fontSize: 10 }}>内部管理・公開不可</span></label>
              <input type="text" value={form.address ?? ""} placeholder="12-3"
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                style={{ ...inputSt, borderColor: "#f0ad4e" }} />
            </div>
            <FI label="地番（登記簿）" name="address_chiban" form={form} setForm={setForm} />
          </div>
          {isMansion && (
            <div style={grid3}>
              <FI label="建物名" name="building_name" form={form} setForm={setForm} placeholder="○○マンション" />
              <FI label="部屋番号" name="room_number" form={form} setForm={setForm} placeholder="301" />
            </div>
          )}
          <div style={sectionTitle}>緯度・経度</div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <FI label="緯度" name="latitude" form={form} setForm={setForm} type="number" placeholder="35.658581" />
            </div>
            <div style={{ flex: 1 }}>
              <FI label="経度" name="longitude" form={form} setForm={setForm} type="number" placeholder="139.745433" />
            </div>
            <button onClick={handleGeocode} style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: "#234f35", color: "#fff", border: "none", cursor: "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap", marginBottom: 1,
            }}>住所から自動取得</button>
          </div>
          <div style={sectionTitle}>最寄駅・交通（最大3件）</div>
          {([1,2,3] as const).map(n => (
            <div key={n}>
              <div style={{ fontSize: 11, color: "#706e68", marginBottom: 6 }}>交通{n}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 1fr 80px", gap: 8 }}>
                <LineInput name={`station_line${n}`} form={form} setForm={setForm} />
                <FI label="駅名" name={`station_name${n}`} form={form} setForm={setForm} placeholder="代官山" />
                <FI label="徒歩(分)" name={`station_walk${n}`} form={form} setForm={setForm} type="number" />
                <FI label="バス停名" name={`bus_stop${n}`} form={form} setForm={setForm} placeholder="○○バス停" />
                <FI label="バス(分)" name={`bus_time${n}`} form={form} setForm={setForm} type="number" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 3: 面積・建物 ── */}
      {tab === 3 && (
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
          <div style={grid3}>
            <FS label="土地権利" name="land_right" form={form} setForm={setForm} options={[
              {v:"所有権",l:"所有権"},{v:"借地権",l:"借地権（地上権）"},{v:"賃借権",l:"借地権（賃借権）"},
            ]} />
            <FI label="地目" name="land_category" form={form} setForm={setForm} placeholder="宅地" />
          </div>
          {!isLand && (
            <>
              <div style={sectionTitle}>建物情報</div>
              <div style={grid3}>
                <FI label="間取り" name="rooms" form={form} setForm={setForm} placeholder="3LDK" />
                <FI label="居室数" name="rooms_count" form={form} setForm={setForm} type="number" placeholder="3" />
                <FI label="LDK帖数" name="ldk_size" form={form} setForm={setForm} type="number" placeholder="18" />
              </div>
              <div style={grid3}>
                <FI label="築年（西暦）" name="building_year" form={form} setForm={setForm} type="number" placeholder="2005" />
                <FI label="築月" name="building_month" form={form} setForm={setForm} type="number" placeholder="3" />
                <FS label="構造" name="structure" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"木造",l:"木造"},{v:"軽量鉄骨",l:"軽量鉄骨"},
                  {v:"重量鉄骨",l:"重量鉄骨"},{v:"RC",l:"RC（鉄筋コンクリート）"},
                  {v:"SRC",l:"SRC（鉄骨鉄筋コンクリート）"},{v:"その他",l:"その他"},
                ]} />
              </div>
              <div style={grid3}>
                <FI label="地上階数" name="floors_total" form={form} setForm={setForm} type="number" />
                <FI label="地下階数" name="floors_basement" form={form} setForm={setForm} type="number" />
                {isMansion && <FI label="所在階" name="floor_unit" form={form} setForm={setForm} type="number" />}
              </div>
              <div style={grid3}>
                <FS label="向き" name="direction" form={form} setForm={setForm} options={[
                  {v:"",l:"選択"},{v:"南",l:"南"},{v:"南東",l:"南東"},{v:"南西",l:"南西"},
                  {v:"東",l:"東"},{v:"西",l:"西"},{v:"北東",l:"北東"},{v:"北西",l:"北西"},{v:"北",l:"北"},
                ]} />
                <FI label="天井高（m）" name="eq_ceiling_height" form={form} setForm={setForm} type="number" placeholder="2.4" />
                {isMansion && <FI label="総戸数" name="total_units" form={form} setForm={setForm} type="number" />}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab 4: 法令・権利 ── */}
      {tab === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={grid3}>
            <FS label="都市計画" name="city_plan" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"市街化区域",l:"市街化区域"},{v:"市街化調整区域",l:"市街化調整区域"},
              {v:"非線引区域",l:"非線引区域"},{v:"準都市計画区域",l:"準都市計画区域"},
            ]} />
          </div>
          <UseZoneEditor form={form} setForm={setForm} />
          {/* Legacy single-value fallback (used only when use_zones is empty) */}
          {(JSON.parse(form.use_zones ?? "[]") as unknown[]).length === 0 && (
            <div style={grid3}>
              <FI label="建ぺい率（%）" name="bcr" form={form} setForm={setForm} type="number" placeholder="60" />
              <FI label="容積率（%）" name="far" form={form} setForm={setForm} type="number" placeholder="200" />
            </div>
          )}
          <div style={sectionTitle}>接道状況</div>
          <RoadEditor form={form} setForm={setForm} />
          {/* Legacy road_side fallback */}
          <div style={{ marginTop: 4 }}>
            <FI label="接道メモ（旧フォーマット・補足）" name="road_side" form={form} setForm={setForm} placeholder="南側6m 公道" />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 4 }}>
            <FC label="私道負担あり" name="private_road" form={form} setForm={setForm} />
            <FC label="セットバック要" name="setback_required" form={form} setForm={setForm} />
            <FC label="建築条件あり" name="building_conditions" form={form} setForm={setForm} />
          </div>
          {form.setback_required === "true" && (
            <div style={{ width: "33%" }}>
              <FI label="セットバック面積（㎡）" name="setback_area" form={form} setForm={setForm} type="number" />
            </div>
          )}
          <div style={grid3}>
            <FS label="再建築可否" name="rebuild_allowed" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"可",l:"再建築可"},{v:"不可",l:"再建築不可"},{v:"要確認",l:"要確認"},
            ]} />
          </div>
          <div style={sectionTitle}>法令制限</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <FC label="国土利用計画法届出" name="national_land_act" form={form} setForm={setForm} />
            <FC label="農地法" name="agricultural_act" form={form} setForm={setForm} />
            <FC label="景観法" name="landscape_act" form={form} setForm={setForm} />
          </div>
        </div>
      )}

      {/* ── Tab 5: 設備・仕様 ── */}
      {tab === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            <div style={{ marginTop: 8, width: "25%" }}>
              <FI label="トイレ数" name="eq_toilet_count" form={form} setForm={setForm} type="number" placeholder="2" />
            </div>
          </div>
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
          <div>
            <div style={sectionTitle}>冷暖房・省エネ</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="エアコン付き" name="eq_ac" form={form} setForm={setForm} />
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
          <div>
            <div style={sectionTitle}>駐車・駐輪</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="駐車場あり" name="eq_parking" form={form} setForm={setForm} />
              <FC label="2台以上可" name="eq_parking_2cars" form={form} setForm={setForm} />
              <FC label="屋根付き駐車場" name="eq_parking_roofed" form={form} setForm={setForm} />
              <FC label="電動シャッターガレージ" name="eq_electric_shutter" form={form} setForm={setForm} />
              <FC label="バイク置場" name="eq_bike_parking" form={form} setForm={setForm} />
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
              <FI label="駐車場月額（円）" name="eq_parking_fee" form={form} setForm={setForm} type="number" />
              <FI label="駐輪台数" name="eq_bicycle_count" form={form} setForm={setForm} type="number" />
            </div>
          </div>
          <div>
            <div style={sectionTitle}>耐震</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 }}>
              <FC label="免震構造" name="eq_seismic_isolation" form={form} setForm={setForm} />
              <FC label="制震装置" name="eq_vibration_control" form={form} setForm={setForm} />
            </div>
            <div style={{ width: "40%" }}>
              <FS label="耐震基準" name="eq_earthquake_resistant" form={form} setForm={setForm} options={[
                {v:"",l:"選択"},{v:"新耐震",l:"新耐震（1981年以降）"},{v:"旧耐震",l:"旧耐震（1981年以前）"},
                {v:"耐震補強済み",l:"耐震補強済み"},
              ]} />
            </div>
          </div>
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
            <div style={{ marginTop: 8, width: "25%" }}>
              <FI label="リフォーム実施年" name="eq_reform_year" form={form} setForm={setForm} type="number" placeholder="2023" />
            </div>
          </div>
          <div>
            <div style={sectionTitle}>その他・外構</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <FC label="テラス" name="eq_terrace" form={form} setForm={setForm} />
              <FC label="ルーフバルコニー" name="eq_roof_balcony" form={form} setForm={setForm} />
              <FC label="パティオ（中庭）" name="eq_patio" form={form} setForm={setForm} />
              <FC label="ウッドデッキ" name="eq_wood_deck" form={form} setForm={setForm} />
              <FC label="バリアフリー" name="eq_barrier_free" form={form} setForm={setForm} />
              <FC label="ホームエレベーター" name="eq_elevator_private" form={form} setForm={setForm} />
              <FC label="エレベーター（共用）" name="eq_elevator" form={form} setForm={setForm} />
              <FC label="角部屋" name="eq_corner" form={form} setForm={setForm} />
              <FC label="最上階" name="eq_top_floor" form={form} setForm={setForm} />
              <FC label="ペット可" name="eq_pet_ok" form={form} setForm={setForm} />
              <FC label="光ファイバー" name="eq_optical_fiber" form={form} setForm={setForm} />
              <FC label="BS・CS対応" name="eq_bs_cs" form={form} setForm={setForm} />
              <FC label="都市ガス" name="eq_gas_city" form={form} setForm={setForm} />
              <FC label="プロパンガス" name="eq_gas_prop" form={form} setForm={setForm} />
              <FC label="公営水道" name="eq_water_city" form={form} setForm={setForm} />
              <FC label="公共下水" name="eq_sewage" form={form} setForm={setForm} />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 6: マンション・費用 ── */}
      {tab === 6 && (
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
                  {v:"",l:"選択"},{v:"全部委託",l:"全部委託"},{v:"一部委託",l:"一部委託"},{v:"自主管理",l:"自主管理"},
                ]} />
                <FI label="管理会社" name="management_company" form={form} setForm={setForm} />
              </div>
            </>
          )}
          {form.land_right !== "所有権" && (
            <>
              <div style={sectionTitle}>借地</div>
              <FI label="地代（月額・円）" name="land_lease_fee" form={form} setForm={setForm} type="number" />
            </>
          )}
          <div style={sectionTitle}>税金</div>
          <div style={grid2}>
            <FI label="固定資産税（年額・万円）" name="fixed_asset_tax" form={form} setForm={setForm} type="number" />
            <FI label="都市計画税（年額・万円）" name="city_planning_tax" form={form} setForm={setForm} type="number" />
          </div>
        </div>
      )}

      {/* ── Tab 7: 引渡し・レインズ・掲載 ── */}
      {tab === 7 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={sectionTitle}>引渡し</div>
          <div style={grid3}>
            <FI label="引渡し時期" name="delivery_timing" form={form} setForm={setForm} placeholder="即時・相談" />
            <FI label="引渡し条件" name="delivery_condition" form={form} setForm={setForm} placeholder="更地渡し等" />
            <FS label="現況" name="delivery_status" form={form} setForm={setForm} options={[
              {v:"空き家",l:"空き家"},{v:"居住中",l:"居住中"},{v:"賃貸中",l:"賃貸中"},
              {v:"建築中",l:"建築中"},{v:"その他",l:"その他"},
            ]} />
          </div>
          <div style={sectionTitle}>レインズ</div>
          <div style={grid3}>
            <FI label="レインズ番号" name="reins_number" form={form} setForm={setForm} />
            <FI label="レインズ登録日" name="reins_registered_at" form={form} setForm={setForm} type="date" />
            <FI label="レインズ更新日" name="reins_updated_at" form={form} setForm={setForm} type="date" />
          </div>
          <div style={grid2}>
            <FS label="レインズ状況" name="reins_status" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"登録済",l:"登録済"},{v:"未登録",l:"未登録"},{v:"登録予定",l:"登録予定"},
            ]} />
            <FI label="広告有効期限" name="ad_valid_until" form={form} setForm={setForm} type="date" />
          </div>
          <div style={sectionTitle}>掲載設定</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <FC label="フェリアホームHP（一般）" name="published_hp" form={form} setForm={setForm} />
            <FC label="フェリアホームHP（会員限定）" name="published_members" form={form} setForm={setForm} />
            <FC label="SUUMO" name="published_suumo" form={form} setForm={setForm} />
            <FC label="athome" name="published_athome" form={form} setForm={setForm} />
            <FC label="Yahoo不動産" name="published_yahoo" form={form} setForm={setForm} />
            <FC label="HOME&apos;S" name="published_homes" form={form} setForm={setForm} />
          </div>
          <div style={grid2}>
            <FI label="SUUMO物件ID" name="suumo_id" form={form} setForm={setForm} />
            <FI label="athome物件ID" name="athome_id" form={form} setForm={setForm} />
            <FI label="Yahoo不動産ID" name="yahoo_id" form={form} setForm={setForm} />
            <FI label="HOME&apos;S物件ID" name="homes_id" form={form} setForm={setForm} />
          </div>
          <FC label="コンプライアンス確認済" name="compliance_checked" form={form} setForm={setForm} />
        </div>
      )}

      {/* ── Tab 8: 地図・周辺環境 ── */}
      {tab === 8 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 地図プレビュー */}
          {form.latitude && form.longitude ? (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e0deda" }}>
              <iframe
                src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=16&output=embed`}
                width="100%" height="360" style={{ border: 0, display: "block" }}
                loading="lazy"
                title="物件地図"
              />
            </div>
          ) : (
            <div style={{ background: "#f7f6f2", borderRadius: 10, border: "1px solid #e0deda", padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#706e68", marginBottom: 8 }}>地図を表示するには「所在地・交通」タブで緯度経度を設定してください</div>
              <button onClick={() => setTab(2)} style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 12,
                background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>所在地タブへ</button>
            </div>
          )}
          <div style={sectionTitle}>周辺施設</div>
          <div style={grid2}>
            <FI label="最寄り小学校（名称・距離）" name="env_elementary_school" form={form} setForm={setForm} placeholder="○○小学校 徒歩5分" />
            <FI label="最寄り中学校（名称・距離）" name="env_junior_high_school" form={form} setForm={setForm} placeholder="○○中学校 徒歩8分" />
            <FI label="最寄りスーパー（名称・距離）" name="env_supermarket" form={form} setForm={setForm} placeholder="○○スーパー 徒歩3分" />
            <FI label="最寄り病院（名称・距離）" name="env_hospital" form={form} setForm={setForm} placeholder="○○クリニック 徒歩5分" />
            <FI label="最寄り公園（名称・距離）" name="env_park" form={form} setForm={setForm} placeholder="○○公園 徒歩2分" />
            <FI label="眺望" name="env_view" form={form} setForm={setForm} placeholder="富士山・スカイラインなど" />
          </div>
          <div style={grid2}>
            <FS label="日当たり" name="env_sunlight" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"良好",l:"良好"},{v:"普通",l:"普通"},{v:"やや暗い",l:"やや暗い"},
            ]} />
            <FS label="騒音レベル" name="env_noise_level" form={form} setForm={setForm} options={[
              {v:"",l:"選択"},{v:"静か",l:"静か"},{v:"普通",l:"普通"},{v:"やや騒がしい",l:"やや騒がしい"},
            ]} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>ハザードマップ情報（洪水・土砂・地震）</label>
            <input value={form.env_disaster_risk ?? ""} placeholder="洪水リスク低・土砂災害区域外"
              onChange={(e) => setForm(f => ({ ...f, env_disaster_risk: e.target.value }))} style={inputSt} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>治安情報</label>
            <input value={form.env_crime_level ?? ""} placeholder="閑静な住宅街・防犯灯整備済み"
              onChange={(e) => setForm(f => ({ ...f, env_crime_level: e.target.value }))} style={inputSt} />
          </div>
        </div>
      )}
    </div>
  );
}
