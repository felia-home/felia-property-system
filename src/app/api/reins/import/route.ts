import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ファイルタイプの自動判別
function detectSourceType(rows: unknown[][]): "MANSION" | "HOUSE" | "LAND" | null {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const col2 = String(rows[i]?.[2] ?? "");
    if (col2.includes("マンション")) return "MANSION";
    if (col2.includes("戸建"))     return "HOUSE";
    if (col2.includes("売地") || col2.includes("土地")) return "LAND";
  }
  return null;
}

// 住所から区名と町名を分離
function splitAddress(address: string | null): { area: string | null; town: string | null } {
  if (!address) return { area: null, town: null };
  const match = address.match(/^([^\s]+?[区市])(.*)/);
  if (match) {
    return { area: match[1], town: match[2].trim() || null };
  }
  return { area: null, town: address };
}

// 路線・駅を分離（全角スペース区切り）
function splitStation(stationStr: string | null): { line: string | null; name: string | null } {
  if (!stationStr) return { line: null, name: null };
  const s = String(stationStr).replace(/　/g, " ").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return { line: parts[0], name: parts.slice(1).join(" ") };
  }
  return { line: s, name: null };
}

// 築年を数値に変換
function parseBuiltYear(text: string | null): number | null {
  if (!text) return null;
  // 数値のみ（Excelシリアル値）はスキップ
  if (/^\d+$/.test(String(text))) return null;
  const match = String(text).match(/(\d{4})年/);
  return match ? parseInt(match[1]) : null;
}

// built_year_text のバリデーション
// 数値のみ（Excelシリアル値）や「年」を含まない値は null にする
function toBuiltYearText(v: unknown): string | null {
  const s = toStr(v);
  if (!s) return null;
  if (/^\d+$/.test(s)) return null;
  if (!s.includes("年")) return null;
  return s;
}

// null安全な数値変換
function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : Math.trunc(v);
  const n = parseInt(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "nan" || s === "NaN" ? null : s;
}

function makeDedup(address: string | null, price: number | null, area: number | null): string {
  const a = address ?? "";
  const p = price != null ? String(price) : "";
  const f = area != null ? area.toFixed(2) : "";
  return `${a}|${p}|${f}`;
}

type ReinsRecord = Prisma.ReinsPropertyCreateInput;

// 行データを reins_properties レコードに変換
function rowToRecord(row: unknown[], sourceType: "MANSION" | "HOUSE" | "LAND"): ReinsRecord {
  if (sourceType === "MANSION") {
    const address = toStr(row[4]);
    const { area, town } = splitAddress(address);
    const { line, name } = splitStation(toStr(row[14]));
    const price = toInt(row[6]);
    const areaM2 = toFloat(row[3]);

    return {
      source_type:      "MANSION",
      property_type:    toStr(row[2]),
      price,
      address,
      area,
      town,
      area_m2:          areaM2,
      area_land_m2:     toFloat(row[13]),
      use_zone:         toStr(row[7]),
      building_name:    toStr(row[9]),
      floor:            toInt(row[10]),
      rooms:            toStr(row[11]),
      management_fee:   toInt(row[12]),
      transaction_type: toStr(row[5]),
      station_line:     line,
      station_name:     name,
      walk_minutes:     toInt(row[15]),
      agent:            toStr(row[16]),
      built_year:       parseBuiltYear(toStr(row[17])),
      built_year_text:  toBuiltYearText(row[17]),
      dedup_key:        makeDedup(address, price, areaM2),
    };
  }

  if (sourceType === "HOUSE") {
    const address = toStr(row[4]);
    const { area, town } = splitAddress(address);
    const { line, name } = splitStation(toStr(row[11]));
    const price = toInt(row[6]);
    const areaLand = toFloat(row[3]);

    return {
      source_type:      "HOUSE",
      property_type:    toStr(row[2]),
      price,
      address,
      area,
      town,
      area_land_m2:     areaLand,
      area_build_m2:    toFloat(row[8]),
      use_zone:         toStr(row[7]),
      rooms:            toStr(row[9]),
      road_contact:     toStr(row[10]),
      transaction_type: toStr(row[5]),
      station_line:     line,
      station_name:     name,
      walk_minutes:     toInt(row[12]),
      direction:        toStr(row[13]),
      agent:            toStr(row[14]),
      built_year:       parseBuiltYear(toStr(row[15])),
      built_year_text:  toBuiltYearText(row[15]),
      dedup_key:        makeDedup(address, price, areaLand),
    };
  }

  // LAND
  const address = toStr(row[4]);
  const { area, town } = splitAddress(address);
  const { line, name } = splitStation(toStr(row[11]));
  const price = toInt(row[6]);
  const areaM2 = toFloat(row[3]);

  return {
    source_type:       "LAND",
    property_type:     toStr(row[2]),
    price,
    address,
    area,
    town,
    area_m2:           areaM2,
    use_zone:          toStr(row[7]),
    building_coverage: toFloat(row[8]),
    floor_area_ratio:  toFloat(row[9]),
    transaction_type:  toStr(row[5]),
    road_contact:      toStr(row[13]),
    station_line:      line,
    station_name:      name,
    walk_minutes:      toInt(row[12]),
    agent:             toStr(row[15]),
    dedup_key:         makeDedup(address, price, areaM2),
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as {
      rows?: unknown[][];
      source_type?: "MANSION" | "HOUSE" | "LAND";
    };
    const rows = body.rows;
    const forcedType = body.source_type;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "データが空です" }, { status: 400 });
    }

    const sourceType = forcedType || detectSourceType(rows);
    if (!sourceType) {
      return NextResponse.json({ error: "物件種別を判別できませんでした" }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // 連番が数値でない行はスキップ（ヘッダー行など）
        if (!Array.isArray(row) || row.length < 3) continue;
        if (row[0] == null || isNaN(Number(row[0]))) continue;

        const record = rowToRecord(row, sourceType);
        if (!record.dedup_key || record.price == null) { skipped++; continue; }

        const existing = await prisma.reinsProperty.findFirst({
          where: { dedup_key: record.dedup_key },
          select: { id: true },
        });

        if (existing) {
          skipped++;
        } else {
          await prisma.reinsProperty.create({ data: record });
          inserted++;
        }
      } catch (e) {
        console.error("row error:", e);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      source_type: sourceType,
      inserted,
      skipped,
      errors,
      total: rows.length,
    });
  } catch (error) {
    console.error("reins import error:", error);
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
