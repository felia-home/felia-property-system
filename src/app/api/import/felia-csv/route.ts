import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadAndUploadToR2 } from "@/lib/import-image";
import { PROPERTY_FEATURES } from "@/lib/propertyFeatures";

// ラベル → ID 変換マップ（旧HPの日本語ラベルを正規化IDに）
const FEATURE_LABEL_TO_ID = (() => {
  const m = new Map<string, string>();
  for (const cat of PROPERTY_FEATURES) {
    for (const item of cat.items) m.set(item.label, item.id);
  }
  return m;
})();

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

  // 写真キャッシュフィールド (photo_count / photo_has_exterior / photo_has_floor_plan / photo_has_interior)
  // を再集計してProperty更新（完成度計算で参照されるため）
  const all = await prisma.propertyImage.findMany({
    where: { property_id: propertyId },
    select: { room_type: true },
  });
  const hasExterior  = all.some(i => i.room_type === "EXTERIOR");
  const hasFloorPlan = all.some(i => i.room_type === "FLOOR_PLAN");
  const hasInterior  = all.some(i =>
    ["LIVING", "KITCHEN", "BEDROOM", "BATHROOM", "TOILET", "ENTRANCE", "BALCONY"].includes(i.room_type ?? "")
  );
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      photo_count:           all.length,
      photo_has_exterior:    hasExterior,
      photo_has_floor_plan:  hasFloorPlan,
      photo_has_interior:    hasInterior,
      photo_last_updated_at: new Date(),
    },
  });
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

// 用途地域1/2 を文字列にまとめる（重複は除外）
function parseUseZones(row: Record<string, unknown>): string[] {
  const zones: string[] = [];
  const z1 = toStr(row["用途地域1"]);
  const z2 = toStr(row["用途地域2"]);
  if (z1) zones.push(z1);
  if (z2 && z2 !== z1) zones.push(z2);
  return zones;
}

// 法令上の制限（カンマ区切り → 配列）
function parseLegalRestrictions(v: unknown): string[] {
  const s = toStr(v);
  if (!s) return [];
  return s.split(/[、,，]/).map(r => r.trim()).filter(Boolean);
}

// ポータル掲載可否（"athome/Yahoo!" などのスラッシュ区切り）
function parsePortalPublish(v: unknown): {
  published_suumo: boolean;
  published_athome: boolean;
  published_yahoo: boolean;
} {
  const s = (toStr(v) ?? "").toLowerCase();
  return {
    published_suumo:  s.includes("suumo"),
    published_athome: s.includes("athome"),
    published_yahoo:  s.includes("yahoo"),
  };
}

// 設備文字列（/区切り）→ 配列。ラベルが master にあれば id に正規化、無ければ label のまま
function parseFeatures(v: unknown): string[] {
  const s = toStr(v);
  if (!s) return [];
  const out: string[] = [];
  for (const raw of s.split("/")) {
    const f = raw.trim();
    if (!f) continue;
    out.push(FEATURE_LABEL_TO_ID.get(f) ?? f);
  }
  return out;
}

// 接道情報 → Prisma の Json 互換配列（Property.roads 用）
type RoadJson = { direction: string; width: string; type: string; contact: string };
function parseRoads(row: Record<string, unknown>): RoadJson[] {
  const out: RoadJson[] = [];
  for (let i = 1; i <= 3; i++) {
    const dir   = toStr(row[`接道${i}(方向)`]);
    const width = toFloat(row[`接道${i}(幅員)`]);
    const type  = toStr(row[`接道${i}(種別)`]);
    if (dir || width != null || (type && type !== "-")) {
      out.push({
        direction: dir ?? "",
        width:     width != null ? String(width) : "",
        type:      type && type !== "-" ? type : "",
        contact:   "",
      });
    }
  }
  return out;
}

const MONTH_ABBR_MAP: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// Excel が住所「6-8」を日付に勝手に変換する問題の逆変換
// パターン: "Jun-08" / "6月8日" / "6/8/2024" などを "6-8" に戻す
function fixAddressDate(v: unknown): string | null {
  const s = toStr(v);
  if (!s) return null;

  // "Jun-08" → "6-8" / "Mar-02" → "3-2"
  const m1 = s.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (m1) {
    const key = m1[1].charAt(0).toUpperCase() + m1[1].slice(1).toLowerCase();
    const month = MONTH_ABBR_MAP[key];
    if (month) return `${month}-${parseInt(m1[2])}`;
  }

  // "7月24日" → "7-24"
  const m2 = s.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (m2) return `${parseInt(m2[1])}-${parseInt(m2[2])}`;

  // "2024/7/24" / "2024-07-24" のような日付（年付き）→ "7-24"（番地っぽいので末尾2要素）
  const m3 = s.match(/^\d{4}[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m3) return `${parseInt(m3[1])}-${parseInt(m3[2])}`;

  if (s === "-" || s === "－") return null;
  return s;
}

function parseBuiltYear(yearMonth: unknown): { year: number | null; month: number | null } {
  const s = toStr(yearMonth);
  if (!s) return { year: null, month: null };

  // YYYY/MM または YYYY-MM
  const m1 = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m1) return { year: parseInt(m1[1]), month: parseInt(m1[2]) };

  // Aug-90 / Jan-2005（Excelが変換した英語月略称）
  const m2 = s.match(/^([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (m2) {
    const key = m2[1].charAt(0).toUpperCase() + m2[1].slice(1).toLowerCase();
    const month = MONTH_ABBR_MAP[key];
    const yr = parseInt(m2[2]);
    const year = yr < 100 ? (yr >= 50 ? 1900 + yr : 2000 + yr) : yr;
    if (month) return { year, month };
  }

  // YYYY年MM月
  const m3 = s.match(/(\d{4})年\s*(\d{1,2})月/);
  if (m3) return { year: parseInt(m3[1]), month: parseInt(m3[2]) };

  // フォールバック: 数値が2つ並ぶ場合（"1990 8" 等）
  const m4 = s.match(/(\d{4})\D+(\d{1,2})/);
  if (m4) return { year: parseInt(m4[1]), month: parseInt(m4[2]) };

  return { year: null, month: null };
}

// POST /api/import/felia-csv
// body: { rows: Record<string, unknown>[], default_agent_id?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows, default_agent_id, skip_images = false } = await req.json() as {
      rows?: Record<string, unknown>[];
      default_agent_id?: string;
      skip_images?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "データが空です" }, { status: 400 });
    }

    // 既存staffsをDBから取得（担当者名→{id, store_id}マップ）
    const allStaffs = await prisma.staff.findMany({
      select: { id: true, name: true, store_id: true },
    });
    const staffByName: Record<string, { id: string; store_id: string | null }> = {};
    const staffById:   Record<string, { id: string; store_id: string | null }> = {};
    for (const s of allStaffs) {
      staffByName[s.name] = { id: s.id, store_id: s.store_id };
      staffById[s.id]     = { id: s.id, store_id: s.store_id };
    }
    const defaultStaff  = default_agent_id ? staffById[default_agent_id] ?? null : null;

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;
    let errors   = 0;
    const errorDetails: string[] = [];

    for (const row of rows) {
      try {
        const oldNumber = toStr(row["自社管理番号"]);
        if (!oldNumber) { skipped++; continue; }

        const propertyNumber = `F${oldNumber}`;

        // property_number は @unique でないため findFirst → update or create で手動upsert
        const existing = await prisma.property.findFirst({
          where: { property_number: propertyNumber },
          select: { id: true },
        });

        const kindLabel    = toStr(row["物件種目"]) ?? "";
        const propertyType = PROPERTY_TYPE_MAP[kindLabel] ?? "USED_HOUSE";

        const staffName = toStr(row["物件担当者名"]);
        const mappedId  = staffName ? STAFF_MAP[staffName] : undefined;
        // STAFF_MAP のID は DB の staff からも store_id を引く
        const fixedStaff = mappedId ? staffById[mappedId] ?? null : null;
        const matchedStaff = staffName ? staffByName[staffName] ?? null : null;
        const staffInfo = fixedStaff ?? matchedStaff;

        const agentId  = staffInfo?.id ?? default_agent_id ?? null;
        const storeId  = staffInfo?.store_id ?? defaultStaff?.store_id ?? null;

        const { year: buildingYear, month: buildingMonth } = parseBuiltYear(row["築年月"]);

        const price            = toInt(row["価格"]);
        // 面積は物件種目で振り分ける
        // - マンション系: area_exclusive_m2 のみ（area_build_m2/area_land_m2 は null）
        // - 戸建て系:    area_build_m2 + area_land_m2（area_exclusive_m2 は null）
        // - 土地:        area_land_m2 のみ
        const isMansion       = propertyType === "MANSION" || propertyType === "NEW_MANSION";
        const isLand          = propertyType === "LAND";
        const buildAreaCsv    = toFloat(row["建物面積(専有面積)"]);
        const landAreaCsv     = toFloat(row["土地面積"]) ?? toFloat(row["敷地面積"]);

        const areaExclusiveM2 = isMansion ? buildAreaCsv : null;
        const areaBuildM2     = !isMansion && !isLand ? buildAreaCsv : null;
        const areaLandM2      = isLand ? landAreaCsv : (isMansion ? null : landAreaCsv);

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

        const featuresArr = parseFeatures(row["設備"]);
        const roadsArr    = parseRoads(row);
        const useZonesArr = parseUseZones(row);
        const portal      = parsePortalPublish(row["ポータルサイトへ登録"]);

        // マンション系は building_name (物件名) で建物マスタを検索
        let mansionBuildingId: string | null = null;
        if (propertyType === "MANSION" || propertyType === "NEW_MANSION") {
          const buildingName = toStr(row["物件名"]);
          if (buildingName) {
            const trimmed = buildingName.replace(/[　\s]/g, "");
            const match = await prisma.mansionBuilding.findFirst({
              where: { name: { contains: trimmed } },
              select: { id: true },
            }) ?? await prisma.mansionBuilding.findFirst({
              where: { name: { contains: buildingName.slice(0, 10) } },
              select: { id: true },
            });
            mansionBuildingId = match?.id ?? null;
          }
        }

        // 共通の保存データ（create / update で同じ内容）
        const baseData = {
          property_type:          propertyType,
          transaction_type:       toStr(row["取引態様"]) ?? "仲介",
          published_hp:           true,
          published_suumo:        portal.published_suumo,
          published_athome:       portal.published_athome,
          published_yahoo:        portal.published_yahoo,
          legal_restrictions:     parseLegalRestrictions(row["法令上の制限.1"]),
          price:                  price ?? 0,
          prefecture:             "東京都",
          city:                   toStr(row["行政区"]) ?? "",
          town:                   toStr(row["町丁目名"]),
          address:                fixAddressDate(row["番地(表示用)"])
                                  ?? fixAddressDate(row["番地(非表示用)"])
                                  ?? "",
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
          floor_unit:             toInt(row["所在階"]),
          direction:              toStr(row["バルコニー方向（主要採光方向）"]),
          area_balcony_m2:        toFloat(row["バルコニー面積"]),
          use_zone:               useZonesArr[0] ?? null,
          use_zones:              useZonesArr.length > 0
            ? useZonesArr.map(z => ({ zone: z, bcr: "", far: "", area_pct: "" }))
            : undefined,
          bcr:                    toFloat(row["建ぺい率1"]),
          far:                    toFloat(row["容積率1"]),
          land_right:             toStr(row["土地権利"]),
          city_plan:              toStr(row["都市計画"]),
          features:               featuresArr,
          roads:                  roadsArr.length > 0 ? roadsArr : undefined,
          delivery_timing:        toStr(row["引渡し"]),
          delivery_status:        toStr(row["現況"]),
          description_hp:         toStr(row["おすすめコメント"]) ??
                                  toStr(row["一覧用コメント"]) ??
                                  toStr(row["Yahooおすすめコメント、スタッフおすすめコメント"]) ??
                                  toStr(row["フリーコメント"]) ??
                                  null,
          internal_memo:          toStr(row["物件備考、備考"]) ?? toStr(row["備考"]) ?? null,
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
          store_id:               storeId,
          mansion_building_id:    mansionBuildingId,
        };

        const created = existing
          ? await prisma.property.update({
              where: { id: existing.id },
              data:  baseData,
            })
          : await prisma.property.create({
              data: {
                ...baseData,
                property_number:    propertyNumber,
                brokerage_type:     "専任",
                status:             "PUBLISHED",
              },
            });

        if (existing) updated++;
        else          inserted++;

        // Yahoo!物件番号があれば画像も一緒にインポート（失敗しても続行）
        // skip_images=true の場合は画像処理をスキップ（高速モード）
        // 既存画像が1枚でもあれば再取得しない（重複防止）
        if (!skip_images && yahooNo) {
          const existingImageCount = await prisma.propertyImage.count({
            where: { property_id: created.id },
          });
          if (existingImageCount === 0) {
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
        }
      } catch (err) {
        errors++;
        errorDetails.push(String(err).slice(0, 120));
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
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
