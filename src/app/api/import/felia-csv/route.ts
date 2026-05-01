import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadAndUploadToR2 } from "@/lib/import-image";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SELL_IMAGE_BASE = "https://img.hs.aws.multi-use.net/adm1/felia/images/sell";

// 周辺環境カテゴリのマッピング
function mapCategory(cat: string | null): string {
  if (!cat) return "OTHER";
  if (cat.includes("スーパー") || cat.includes("買物"))     return "SUPERMARKET";
  if (cat.includes("学校")     || cat.includes("学ぶ"))     return "SCHOOL";
  if (cat.includes("公園"))                                  return "PARK";
  if (cat.includes("病院")     || cat.includes("医療"))     return "HOSPITAL";
  if (cat.includes("駅")       || cat.includes("交通"))     return "STATION";
  if (cat.includes("コンビニ"))                              return "CONVENIENCE";
  return "OTHER";
}

// 物件画像インポート（外観 + 間取り + 画像1〜34）
async function importPropertyImages(
  propertyId: string,
  yahooNo: string,
  row: Record<string, unknown>
): Promise<void> {
  const get = (k: string): string | null => {
    const v = row[k];
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  let order = 1;

  // 外観 (_1.jpg)
  const gaikan = get("外観画像コメント(100文字)");
  if (gaikan) {
    const url = await downloadAndUploadToR2(`${SELL_IMAGE_BASE}/${yahooNo}_1.jpg`, "properties");
    if (url) {
      await prisma.propertyImage.create({
        data: {
          property_id: propertyId,
          url, filename: url.split("/").pop() ?? "exterior.jpg",
          caption: gaikan, order: order++, is_main: true,
          room_type: "EXTERIOR",
        },
      });
    }
  }

  // 間取り (_2.jpg)
  const madori = get("間取り・区画画像コメント(100文字)");
  if (madori) {
    const url = await downloadAndUploadToR2(`${SELL_IMAGE_BASE}/${yahooNo}_2.jpg`, "properties");
    if (url) {
      await prisma.propertyImage.create({
        data: {
          property_id: propertyId,
          url, filename: url.split("/").pop() ?? "floorplan.jpg",
          caption: madori, order: order++, is_main: false,
          room_type: "FLOOR_PLAN",
        },
      });
    }
  }

  // 画像1〜34 (_N+1.jpg)
  for (let i = 1; i <= 34; i++) {
    const comment = get(`画像${i}コメント(100文字)`);
    if (!comment) continue;
    const url = await downloadAndUploadToR2(`${SELL_IMAGE_BASE}/${yahooNo}_${i + 1}.jpg`, "properties");
    if (url) {
      await prisma.propertyImage.create({
        data: {
          property_id: propertyId,
          url, filename: url.split("/").pop() ?? `image${i}.jpg`,
          caption: comment, order: order++, is_main: false,
        },
      });
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

// 周辺環境写真インポート（_s1.jpg〜_s9.jpg）
async function importEnvImages(
  propertyId: string,
  yahooNo: string,
  row: Record<string, unknown>
): Promise<void> {
  const get = (k: string): string | null => {
    const v = row[k];
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };
  const getNum = (k: string): number | null => {
    const v = row[k];
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  for (let i = 1; i <= 9; i++) {
    const comment = get(`周辺画像${i}コメント（100文字）`) ?? get(`周辺画像${i}コメント(100文字)`);
    if (!comment) continue;

    const facilityName =
      get(`周辺環境${i}名称`) ||
      get(`周辺環境名称${i}`) ||
      comment.slice(0, 30);
    const distance = getNum(`周辺環境${i}距離`);
    const category = get(`周辺画像${i}カテゴリ`);

    const url = await downloadAndUploadToR2(`${SELL_IMAGE_BASE}/${yahooNo}_s${i}.jpg`, "env-images");
    if (!url) continue;

    // PropertyEnvironmentImage はフラットなテーブル。同じURLが既にあれば再利用
    const existing = await prisma.propertyEnvironmentImage.findFirst({
      where: { url },
      select: { id: true },
    });

    let envImageId: string;
    if (existing) {
      envImageId = existing.id;
    } else {
      const created = await prisma.propertyEnvironmentImage.create({
        data: {
          url,
          filename:      url.split("/").pop() ?? "env.jpg",
          facility_name: facilityName,
          caption:       comment,
          facility_type: mapCategory(category),
        },
      });
      envImageId = created.id;
    }

    await prisma.propertyEnvImageLink.upsert({
      where: { property_id_image_id: { property_id: propertyId, image_id: envImageId } },
      create: {
        property_id:  propertyId,
        image_id:     envImageId,
        walk_minutes: distance != null ? Math.max(1, Math.round(distance / 80)) : null,
      },
      update: {},
    });

    await new Promise(r => setTimeout(r, 200));
  }
}

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

        const yahooNo = toStr(row["Yahoo!物件番号"]);

        const created = await prisma.property.create({
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

        // Yahoo!物件番号があれば画像も一緒にインポート（失敗しても続行）
        if (yahooNo) {
          try {
            await importPropertyImages(created.id, yahooNo, row);
          } catch (e) {
            console.error(`[import] image error for ${propertyNumber}:`, e);
          }
          try {
            await importEnvImages(created.id, yahooNo, row);
          } catch (e) {
            console.error(`[import] env image error for ${propertyNumber}:`, e);
          }
        }
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
