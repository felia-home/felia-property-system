import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ── 型 ──────────────────────────────────────────────────────────────────────

export interface CsvImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  preview: Array<Record<string, string>>;
  headers: string[];
  mappings: Record<string, string>;
}

// ── 文字コード変換（Shift-JIS / EUC-JP / UTF-8 → JS string） ────────────────

async function convertToUtf8(buffer: ArrayBuffer): Promise<string> {
  // dynamic import で読み込む（静的 import だとビルド時バンドルで解決されないことがある）
  const Encoding = (await import("encoding-japanese")).default;
  const uint8Array = new Uint8Array(buffer);

  const detected = Encoding.detect(uint8Array);
  console.log("[CSV Import] 検出文字コード:", detected);

  // UNICODE / UTF8 と誤検出された場合は SJIS として強制変換
  const fromEncoding = (!detected || detected === "UNICODE" || detected === "UTF8")
    ? "SJIS"
    : detected;
  console.log("[CSV Import] 使用する文字コード:", fromEncoding);

  const utf8Array = Encoding.convert(uint8Array, {
    to: "UTF8",
    from: fromEncoding,
  });

  const result = new TextDecoder("utf-8").decode(new Uint8Array(utf8Array));
  console.log("[CSV Import] 変換後先頭100文字:", result.slice(0, 100));
  return result;
}

// ── CSV パーサ（文字列を受け取る） ───────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      row.push(field.trim());
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
    i++;
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(c => c !== "")) rows.push(row);
  }

  return rows;
}

// ── ハトサポ形式カラムマッピング ──────────────────────────────────────────────

// Maps schema field name → list of possible CSV header names (Japanese or English)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  legacy_id:            ["自社管理番号", "物件番号", "管理番号", "k_number", "ID", "id", "物件ID"],
  property_type:        ["物件種目", "物件種別", "種別", "type", "物件タイプ"],
  status:               ["ステータス", "status", "掲載状態"],  // 公開設定は skip-logic 専用なのでここに含めない
  title:                ["物件名", "タイトル", "title"],
  catch_copy:           ["キャッチコピー", "新築オウチーノキャッチコピー", "catch_copy"],

  // 所在地
  postal_code:          ["郵便番号", "postal", "zip"],
  city:                 ["行政区", "市区町村", "所在地_市区", "city", "市区"],  // "エリア"は除外（リゾートエリアコード等に誤マッチするため）
  town:                 ["町丁目名", "町名", "丁目", "所在地_町", "town"],
  address:              ["番地(表示用)", "番地以降", "番地", "address", "住所表示"],
  address_chiban:       ["地番", "address_chiban", "住所（地番）"],

  // 価格
  price:                ["価格", "売価", "販売価格", "売出価格", "price"],

  // 交通（最大3駅） — ハトサポ形式: 沿線1/駅1/駅徒歩1、汎用形式: 路線名1/駅名1/徒歩分数1
  station_line1:        ["沿線1", "路線名1", "路線1", "バス路線名1", "路線", "路線名", "line", "station_line"],
  station_name1:        ["駅1", "駅名1", "バス駅名1", "最寄り駅1", "最寄り駅", "最寄駅", "駅名", "station", "station_name"],
  station_walk1:        ["駅徒歩1", "徒歩分数1", "徒歩1", "徒歩", "徒歩分", "walk", "station_walk"],
  station_line2:        ["沿線2", "路線名2", "路線2", "バス路線名2"],
  station_name2:        ["駅2", "駅名2", "バス駅名2", "最寄り駅2"],
  station_walk2:        ["駅徒歩2", "徒歩分数2", "徒歩2"],
  station_line3:        ["沿線3", "路線名3", "路線3", "バス路線名3"],
  station_name3:        ["駅3", "駅名3", "バス駅名3", "最寄り駅3"],
  station_walk3:        ["駅徒歩3", "徒歩分数3", "徒歩3"],

  // 面積
  area_land_m2:         ["敷地面積", "土地面積(㎡)", "土地面積", "area_land", "土地㎡"],
  area_build_m2:        ["建物面積(専有面積)", "建物面積(㎡)", "建物面積", "延床面積", "area_build", "建物㎡"],
  area_exclusive_m2:    ["専有面積(㎡)", "専有面積", "area_exclusive", "専有㎡"],

  // 建物情報
  rooms:                ["間取り", "間取", "layout", "rooms"],
  building_year:        ["築年", "建築年", "築年月", "year"],
  building_month:       ["築月", "建築月"],
  structure:            ["構造", "建物構造", "structure"],
  floors_total:         ["地上階", "総階数", "地上階数", "floors"],
  floors_basement:      ["地下階数", "basement_floors"],
  floor_unit:           ["所在階", "階"],
  direction:            ["向き", "direction"],
  total_units:          ["総戸数", "戸数", "total_units"],

  // 法令
  city_plan:            ["都市計画", "city_plan"],
  use_zone:             ["用途地域", "用途地域名称", "use_zone"],
  bcr:                  ["建ぺい率1", "建ぺい率", "建蔽率", "建ぺい率(%)", "bcr"],
  far:                  ["容積率1", "容積率", "容積率(%)", "far"],
  land_right:           ["権利形態", "土地権利", "land_right"],
  land_category:        ["地目", "land_category"],
  road_direction:       ["接道方向", "road_direction", "接道1_方位"],
  road_width:           ["接道幅員", "road_width", "接道1_幅員(m)", "接道幅員(m)"],
  road_type:            ["接道種別", "road_type", "接道1_種別"],

  // 費用・管理
  management_fee:       ["管理費", "管理費（月額）", "管理費(月額)", "管理費(月)", "management_fee"],
  repair_reserve:       ["修繕積立金", "修繕費", "修繕積立金(月額)", "修繕積立金(月)", "repair_fund", "repair_reserve"],
  other_monthly_fee:    ["その他月額費用", "other_monthly_fee"],
  management_type:      ["管理形態", "management_type"],
  management_company:   ["管理会社", "management_company"],

  // 引渡し・レインズ
  delivery_timing:      ["引渡し", "引渡時期", "delivery", "引渡し時期"],
  delivery_condition:   ["現況", "現況確認", "delivery_condition", "引渡現況"],
  reins_number:         ["レインズ番号", "レインズ", "reins"],

  // 売主情報
  seller_company:       ["元付業者", "売主", "取扱業者", "seller_company"],
  seller_contact:       ["元付連絡先", "業者電話", "売主電話", "seller_contact", "seller_tel"],

  // 周辺環境
  env_elementary_school:   ["小学校区", "小学校", "env_elementary_school"],
  env_junior_high_school:  ["中学校区", "中学校", "env_junior_high_school"],

  // 内部メモ
  internal_memo:        ["社内メモ", "備考", "memo", "notes", "設備備考"],
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "新築一戸建て": "NEW_HOUSE",
  "新築戸建": "NEW_HOUSE",
  "新築": "NEW_HOUSE",
  "中古一戸建て": "USED_HOUSE",
  "中古戸建": "USED_HOUSE",
  "中古戸建て": "USED_HOUSE",
  "一戸建て": "USED_HOUSE",
  "中古マンション": "MANSION",
  "マンション": "MANSION",
  "新築マンション": "NEW_MANSION",
  "土地": "LAND",
  "売地": "LAND",
};

const STATUS_MAP: Record<string, string> = {
  "下書き": "DRAFT",
  "掲載中": "PUBLISHED_HP",
  "HP掲載中": "PUBLISHED_HP",
  "全掲載中": "PUBLISHED_ALL",
  "成約": "SOLD",
  "一時停止": "SUSPENDED",
  "確認待ち": "PENDING",
  "承認済み": "APPROVED",
};

// Numeric fields
const NUMERIC_FIELDS = new Set([
  "price", "station_walk1", "station_walk2", "station_walk3",
  "area_land_m2", "area_build_m2", "area_exclusive_m2", "area_balcony_m2",
  "building_year", "building_month", "floors_total", "floors_basement",
  "floor_unit", "total_units", "bcr", "far", "road_width",
  "management_fee", "repair_reserve", "other_monthly_fee", "land_lease_fee",
  "fixed_asset_tax", "city_planning_tax", "latitude", "longitude",
]);

// ── ハトサポシステム判定 ──────────────────────────────────────────────────────

// ハトサポCSVに特徴的なヘッダー
const HATSUPO_SIGNATURE_HEADERS = [
  "自社管理番号", "物件種目", "Yahoo!物件番号", "沿線1", "駅1", "駅徒歩1",
  "行政区", "町丁目名", "番地(表示用)",
];

// ハトサポ形式と判定した場合に適用する固定マッピング（ヘッダーが存在する場合のみ設定）
const HATSUPO_FIXED_MAPPINGS: Record<string, string> = {
  legacy_id:              "自社管理番号",
  property_type:          "物件種目",
  postal_code:            "郵便番号",
  city:                   "行政区",
  town:                   "町丁目名",
  address:                "番地(表示用)",
  address_chiban:         "番地(非表示用)",
  station_line1:          "沿線1",
  station_name1:          "駅1",
  station_walk1:          "駅徒歩1",
  station_line2:          "沿線2",
  station_name2:          "駅2",
  station_walk2:          "駅徒歩2",
  station_line3:          "沿線3",
  station_name3:          "駅3",
  station_walk3:          "駅徒歩3",
  area_land_m2:           "敷地面積",
  area_build_m2:          "建物面積(専有面積)",
  rooms:                  "間取り",
  building_year:          "築年月",
  structure:              "建物構造",
  floors_total:           "地上階",
  bcr:                    "建ぺい率1",
  far:                    "容積率1",
  use_zone:               "用途地域1",
  land_right:             "土地権利",
  land_category:          "地目",
  delivery_timing:        "引渡し時期",
  delivery_condition:     "現況",
  title:                  "物件名",
  seller_company:         "業者名",
  seller_contact:         "業者電話番号",
  env_elementary_school:  "小学校名",
  env_junior_high_school: "中学校名",
  latitude:               "位置情報(緯度)",
  longitude:              "位置情報(経度)",
  internal_memo:          "物件備考",
};

// ── カラム自動検出 ────────────────────────────────────────────────────────────

function detectMappings(headers: string[]): Record<string, string> {
  const headerSet = new Set(headers.map(h => h.trim()));

  // ハトサポ形式判定
  const isHatsupo = HATSUPO_SIGNATURE_HEADERS.some(sig => headerSet.has(sig));

  const result: Record<string, string> = {};

  if (isHatsupo) {
    // ハトサポ固定マッピングを先に適用（ヘッダーが実際に存在する場合のみ）
    for (const [field, header] of Object.entries(HATSUPO_FIXED_MAPPINGS)) {
      if (headerSet.has(header)) {
        result[field] = header;
      }
    }
  }

  // 残りのフィールドは汎用パターンマッチングで補完
  for (const [field, patterns] of Object.entries(COLUMN_MAPPINGS)) {
    if (result[field]) continue; // already mapped
    for (const header of headers) {
      const h = header.trim();
      if (patterns.some(p =>
        h === p ||
        h.toLowerCase() === p.toLowerCase()
        // 部分一致は意図しないマッチ（リゾートエリアコード等）を防ぐため使用しない
      )) {
        result[field] = h;
        break;
      }
    }
  }
  return result;
}

// ── 行データ → Prisma プロパティ ──────────────────────────────────────────────

function rowToProperty(
  rowData: Record<string, string>,
  mappings: Record<string, string>
): Record<string, unknown> {
  const prop: Record<string, unknown> = {
    prefecture: "東京都",
    transaction_type: "仲介",
    brokerage_type: "専任",
    status: "DRAFT",
  };

  for (const [field, headerName] of Object.entries(mappings)) {
    const raw = (rowData[headerName] ?? "").trim();
    if (!raw) continue;

    if (field === "property_type") {
      prop[field] = PROPERTY_TYPE_MAP[raw] ?? raw.toUpperCase();
    } else if (field === "status") {
      prop[field] = STATUS_MAP[raw] ?? "DRAFT";
    } else if (NUMERIC_FIELDS.has(field)) {
      const n = parseFloat(raw.replace(/,/g, "").replace(/[万円㎡坪%]/g, ""));
      if (!isNaN(n)) prop[field] = n;
    } else {
      prop[field] = raw;
    }
  }

  return prop;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string | null) ?? "preview";
    const mappingsJson = formData.get("mappings") as string | null;

    if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });

    // Shift_JIS / EUC-JP / UTF-8 を正しく文字列化してからパース
    const csvText = await convertToUtf8(await file.arrayBuffer());
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSVにデータ行がありません" }, { status: 400 });
    }

    const headers = rows[0].map(h => h.trim());
    console.log("[CSV Import] ヘッダー先頭5件:", headers.slice(0, 5));
    const dataRows = rows.slice(1);

    const mappings: Record<string, string> = mappingsJson
      ? JSON.parse(mappingsJson)
      : detectMappings(headers);

    // Preview mode: return headers + mappings + first 5 rows
    if (mode === "preview") {
      const preview = dataRows.slice(0, 5).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      });
      return NextResponse.json({ headers, mappings, preview, total: dataRows.length });
    }

    // Import mode
    const result: CsvImportResult = {
      total: dataRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      preview: [],
      headers,
      mappings,
    };

    // Find the 公開設定 column header (if present)
    const publicSettingHeader = mappings["status"]
      ? (headers.includes("公開設定") ? "公開設定" : null)
      : null;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData: Record<string, string> = {};
      headers.forEach((h, j) => { rowData[h] = row[j] ?? ""; });

      try {
        // Skip rows explicitly marked 非公開
        const publicSetting = rowData["公開設定"] ?? "";
        if (publicSetting === "非公開") {
          result.skipped++;
          continue;
        }

        const prop = rowToProperty(rowData, mappings);

        // Require at least property_type and (price or city)
        if (!prop.property_type || (!prop.price && !prop.city)) {
          result.skipped++;
          result.errors.push({
            row: i + 2,
            message: "必須項目（物件種別・価格または市区町村）が不足",
          });
          continue;
        }

        const legacyId = prop.legacy_id as string | undefined;

        // Deduplication: check legacy_id → full field update if found
        if (legacyId) {
          const existing = await prisma.property.findFirst({
            where: { legacy_id: legacyId },
          });
          if (existing) {
            // legacy_id 自体は更新対象から除外してその他全フィールドを上書き
            const { legacy_id: _lid, ...updateData } = prop;
            void _lid;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await prisma.property.update({ where: { id: existing.id }, data: updateData as any });
            result.updated++;
            continue;
          }
        }

        if (!prop.property_type) prop.property_type = "USED_HOUSE";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.property.create({ data: prop as any });
        result.created++;
      } catch (err) {
        result.errors.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "不明なエラー",
        });
        result.skipped++;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/import/csv error:", error);
    return NextResponse.json(
      {
        error: `インポートに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
