import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "中古マンション": "MANSION",
  "新築マンション": "NEW_MANSION",
  "新築戸建て":     "NEW_HOUSE",
  "中古戸建て":     "USED_HOUSE",
  "売地":           "LAND",
};

const STAFF_MAP: Record<string, string> = {
  "伊藤 貴洋": "cmni6ylh3000513yyl8ia6qwz",
  "波多 隆二": "cmni6ylj2000p13yymn12t1lr",
};

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n);
}

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseBuiltYear(yearMonth: unknown): { year: number | null; month: number | null } {
  const s = toStr(yearMonth);
  if (!s) return { year: null, month: null };
  const m = s.match(/(\d{4})\D+(\d{1,2})/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  return { year: null, month: null };
}

// POST /api/import/felia-csv
// body: { rows: Record<string, unknown>[], default_agent_id?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows, default_agent_id } = await req.json() as {
      rows?: Record<string, unknown>[];
      default_agent_id?: string;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "データが空です" }, { status: 400 });
    }

    // 既存staffsをDBから取得（担当者名→idマップ）
    const allStaffs = await prisma.staff.findMany({ select: { id: true, name: true } });
    const staffByName: Record<string, string> = {};
    for (const s of allStaffs) staffByName[s.name] = s.id;

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;
    const errorDetails: string[] = [];

    for (const row of rows) {
      try {
        const oldNumber = toStr(row["自社管理番号"]);
        if (!oldNumber) { skipped++; continue; }

        const propertyNumber = `F${oldNumber}`;

        const existing = await prisma.property.findFirst({
          where: { property_number: propertyNumber },
          select: { id: true },
        });
        if (existing) { skipped++; continue; }

        const kindLabel    = toStr(row["物件種目"]) ?? "";
        const propertyType = PROPERTY_TYPE_MAP[kindLabel] ?? "USED_HOUSE";

        const staffName = toStr(row["物件担当者名"]);
        const agentId   =
          (staffName && (STAFF_MAP[staffName] || staffByName[staffName])) ||
          default_agent_id ||
          null;

        const { year: buildingYear, month: buildingMonth } = parseBuiltYear(row["築年月"]);

        const price            = toInt(row["価格"]);
        const areaExclusiveM2  = toFloat(row["建物面積(専有面積)"]);
        const areaBuildM2      = toFloat(row["建物面積(専有面積)"]);
        const areaLandM2       = toFloat(row["土地面積"]) ?? toFloat(row["敷地面積"]);

        const stationLine1 = toStr(row["沿線1"]);
        const stationName1 = toStr(row["駅1"]);
        const stationWalk1 = toInt(row["駅徒歩1"]);
        const stationLine2 = toStr(row["沿線2"]);
        const stationName2 = toStr(row["駅2"]);
        const stationWalk2 = toInt(row["駅徒歩2"]);
        const stationLine3 = toStr(row["沿線3"]);
        const stationName3 = toStr(row["駅3"]);
        const stationWalk3 = toInt(row["駅徒歩3"]);

        const schoolElementary = toStr(row["小学校名"]);
        const schoolJuniorHigh = toStr(row["中学校名"]);

        const hpComments = [
          toStr(row["HP掲出用1  "]),
          toStr(row["HP掲出用1"]),
          toStr(row["HP掲出用2"]),
          toStr(row["HP掲出用3"]),
        ].filter((v): v is string => Boolean(v));

        const buildingName  = toStr(row["物件名"]);
        const managementFee = toInt(row["管理費"]);
        const repairReserve = toInt(row["修繕積立金"]);

        await prisma.property.create({
          data: {
            property_number:        propertyNumber,
            property_type:          propertyType,
            transaction_type:       "仲介",
            brokerage_type:         "専任",
            published_hp:           true,
            price:                  price ?? 0,
            prefecture:             "東京都",
            city:                   toStr(row["行政区"]) ?? "",
            town:                   toStr(row["町丁目名"]),
            address:                toStr(row["番地(表示用)"]) ?? "",
            latitude:               toFloat(row["位置情報(緯度)"]),
            longitude:              toFloat(row["位置情報(経度)"]),
            building_name:          buildingName,
            rooms:                  toStr(row["間取り"]),
            area_build_m2:          areaBuildM2,
            area_exclusive_m2:      areaExclusiveM2,
            area_land_m2:           areaLandM2,
            building_year:          buildingYear,
            building_month:         buildingMonth,
            structure:              toStr(row["建物構造"]),
            total_units:            toInt(row["総戸数"]),
            floors_total:           toInt(row["地上階"]),
            floors_basement:        toInt(row["地下階"]),
            management_fee:         managementFee,
            repair_reserve:         repairReserve,
            management_type:        toStr(row["管理形態"]),
            management_company:     toStr(row["管理会社名"]),
            station_line1:          stationLine1,
            station_name1:          stationName1,
            station_walk1:          stationWalk1,
            station_line2:          stationLine2,
            station_name2:          stationName2,
            station_walk2:          stationWalk2,
            station_line3:          stationLine3,
            station_name3:          stationName3,
            station_walk3:          stationWalk3,
            school_elementary:      schoolElementary,
            env_elementary_school:  schoolElementary,
            school_junior_high:     schoolJuniorHigh,
            selling_points:         hpComments,
            agent_id:               agentId,
            status:                 "ACTIVE",
          },
        });

        inserted++;
      } catch (err) {
        errors++;
        errorDetails.push(String(err).slice(0, 120));
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      errors,
      total: rows.length,
      error_details: errorDetails.slice(0, 10),
    });
  } catch (error) {
    console.error("import error:", error);
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
