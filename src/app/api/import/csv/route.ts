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

// ── CSV パーサ（Shift-JIS / UTF-8 対応） ────────────────────────────────────

function parseCSV(buffer: Buffer): string[][] {
  // Try UTF-8 BOM first, then UTF-8, then Shift-JIS
  let text: string;
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    text = buffer.slice(3).toString("utf-8");
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      try {
        text = new TextDecoder("shift_jis").decode(buffer);
      } catch {
        text = buffer.toString("utf-8");
      }
    }
  }

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

// ── カラム自動マッピング ──────────────────────────────────────────────────────

const COLUMN_MAPPINGS: Record<string, string[]> = {
  legacy_id:       ["物件番号", "ID", "k_number", "id", "物件ID"],
  property_type:   ["物件種別", "種別", "type", "物件タイプ"],
  price:           ["価格", "売価", "販売価格", "売出価格", "price"],
  city:            ["市区町村", "所在地_市区", "city", "市区", "エリア"],
  town:            ["町名", "丁目", "所在地_町", "town"],
  address:         ["番地", "住所", "番地以降", "address"],
  postal_code:     ["郵便番号", "postal", "zip"],
  station_name1:   ["最寄り駅", "最寄駅", "駅名", "station", "station_name"],
  station_walk1:   ["徒歩", "徒歩分", "walk", "station_walk"],
  station_line1:   ["路線", "路線名", "line", "station_line"],
  area_land_m2:    ["土地面積", "敷地面積", "area_land", "土地㎡"],
  area_build_m2:   ["建物面積", "延床面積", "area_build", "建物㎡"],
  area_exclusive_m2: ["専有面積", "area_exclusive", "専有㎡"],
  rooms:           ["間取り", "間取", "layout", "rooms"],
  building_year:   ["築年", "建築年", "year", "築年月"],
  building_month:  ["築月", "建築月"],
  structure:       ["構造", "建物構造", "structure"],
  floors_total:    ["総階数", "階数", "floors"],
  floor_unit:      ["所在階", "階"],
  reins_number:    ["レインズ番号", "レインズ", "reins"],
  bcr:             ["建ぺい率", "建蔽率", "bcr"],
  far:             ["容積率", "far"],
  management_fee:  ["管理費", "管理費（月額）", "management_fee"],
  repair_reserve:  ["修繕積立金", "修繕費", "repair_reserve"],
  delivery_timing: ["引渡し", "引渡時期", "delivery"],
  title:           ["物件名", "タイトル", "title"],
  catch_copy:      ["キャッチコピー", "catch_copy"],
  status:          ["ステータス", "status", "掲載状態"],
  seller_company:  ["元付業者", "売主", "取扱業者", "seller_company"],
  seller_contact:  ["元付連絡先", "業者電話", "seller_contact"],
  internal_memo:   ["社内メモ", "備考", "memo", "notes"],
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "新築一戸建て": "NEW_HOUSE", "新築戸建": "NEW_HOUSE", "新築": "NEW_HOUSE",
  "中古一戸建て": "USED_HOUSE", "中古戸建": "USED_HOUSE", "中古戸建て": "USED_HOUSE",
  "中古マンション": "MANSION", "マンション": "MANSION",
  "新築マンション": "NEW_MANSION",
  "土地": "LAND", "売地": "LAND",
};

function detectMappings(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, patterns] of Object.entries(COLUMN_MAPPINGS)) {
    for (const header of headers) {
      const h = header.trim();
      if (patterns.some(p => h === p || h.toLowerCase() === p.toLowerCase() || h.includes(p))) {
        result[field] = h;
        break;
      }
    }
  }
  return result;
}

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
    } else if (["price", "station_walk1", "area_land_m2", "area_build_m2", "area_exclusive_m2",
                 "building_year", "building_month", "floors_total", "floor_unit",
                 "bcr", "far", "management_fee", "repair_reserve"].includes(field)) {
      const n = parseFloat(raw.replace(/,/g, "").replace(/[万円㎡]/g, ""));
      if (!isNaN(n)) prop[field] = n;
    } else if (field === "status") {
      // Map Japanese status to enum
      const statusMap: Record<string, string> = {
        "下書き": "DRAFT", "掲載中": "PUBLISHED_HP", "成約": "SOLD", "一時停止": "SUSPENDED",
      };
      prop[field] = statusMap[raw] ?? "DRAFT";
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseCSV(buffer);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSVにデータ行がありません" }, { status: 400 });
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    // Use provided mappings or auto-detect
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
      total: dataRows.length, created: 0, updated: 0, skipped: 0,
      errors: [], preview: [], headers, mappings,
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData: Record<string, string> = {};
      headers.forEach((h, j) => { rowData[h] = row[j] ?? ""; });

      try {
        const prop = rowToProperty(rowData, mappings);

        // Require at least property_type and price OR city
        if (!prop.property_type || (!prop.price && !prop.city)) {
          result.skipped++;
          result.errors.push({ row: i + 2, message: "必須項目（物件種別・価格または市区町村）が不足" });
          continue;
        }

        const legacyId = prop.legacy_id as string | undefined;

        // Dedup: check legacy_id
        if (legacyId) {
          const existing = await prisma.property.findFirst({ where: { legacy_id: legacyId } });
          if (existing) {
            delete prop.legacy_id;
            await prisma.property.update({ where: { id: existing.id }, data: prop });
            result.updated++;
            continue;
          }
        }

        if (!prop.property_type) prop.property_type = "USED_HOUSE";
        await prisma.property.create({ data: prop as Parameters<typeof prisma.property.create>[0]["data"] });
        result.created++;
      } catch (err) {
        result.errors.push({ row: i + 2, message: err instanceof Error ? err.message : "不明なエラー" });
        result.skipped++;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/import/csv error:", error);
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
