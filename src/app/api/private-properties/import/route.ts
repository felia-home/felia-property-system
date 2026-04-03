import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Encoding from "encoding-japanese";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });

    // Shift_JIS → UTF-8 変換
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const detected = Encoding.detect(uint8Array);
    const unicodeArray = Encoding.convert(uint8Array, {
      to: "UNICODE",
      from: detected || "SJIS",
    });
    const text = Encoding.codeToString(unicodeArray);

    // CSV パース（ダブルクォート内の改行に対応）
    const rows = parseCSV(text);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (row.length < 14) continue;

      const managementNo = row[13]?.trim();
      if (!managementNo) continue;

      try {
        // 担当者を名前で検索（全角スペースを除去して比較）
        const staffNameRaw = row[6]?.replace(/[\s　]+/g, "").trim();
        let agentId: string | null = null;
        if (staffNameRaw) {
          const staff = await prisma.staff.findFirst({
            where: { name: { contains: staffNameRaw } },
          });
          agentId = staff?.id ?? null;
        }

        // 価格をパース（「2,980」→2980、「153,000」→153000）
        const priceRaw = row[1]
          ?.replace(/,/g, "")
          .replace(/[万円以上以下〜～]/g, "")
          .trim();
        const priceNum = priceRaw ? parseFloat(priceRaw) : null;
        const price = priceNum && !isNaN(priceNum) ? Math.round(priceNum) : null;

        // 面積をパース（範囲表記の場合は最初の数値）
        const areaLandRaw = row[9]?.split(/[〜～・]/)[0]?.replace(/[㎡]/g, "").trim();
        const areaLand = areaLandRaw && areaLandRaw !== "" ? parseFloat(areaLandRaw) || null : null;
        const areaBuildRaw = row[3]?.split(/[〜～・]/)[0]?.replace(/[㎡]/g, "").trim();
        const areaBuild = areaBuildRaw && areaBuildRaw !== "" ? parseFloat(areaBuildRaw) || null : null;

        // 種別 → is_land/is_house/is_mansion
        const typeRaw = row[12]?.trim();
        const isLand = typeRaw === "土地";
        const isMansion = typeRaw === "マンション";
        const isHouse = !isLand && !isMansion; // デフォルト戸建て

        // 取引形態 → listing_type (SENIN | PRIVATE)
        const transactionType = row[14]?.trim() ?? null;
        const listingType = transactionType === "専任" ? "SENIN" : "PRIVATE";

        // 更新日
        const infoDateRaw = row[8]?.trim();
        const infoDate = infoDateRaw ? new Date(infoDateRaw) : null;
        const validInfoDate = infoDate && !isNaN(infoDate.getTime()) ? infoDate : null;

        // 備考（改行そのまま）
        const note = row[0]?.trim() || null;

        // 区・町名
        const area = row[2]?.trim() || null;
        const town = row[7]?.trim() || null;

        // upsert（property_no = management_no で重複チェック）
        await prisma.privateProperty.upsert({
          where: { property_no: managementNo },
          create: {
            property_no: managementNo,
            listing_type: listingType,
            is_land: isLand,
            is_house: isHouse,
            is_mansion: isMansion,
            area,
            town,
            price,
            price_display: row[1]?.trim() || null,
            area_land_m2: areaLand,
            area_build_m2: areaBuild,
            commission: row[5]?.trim() || null,
            note,
            transaction_type: transactionType,
            seller_name: row[11]?.trim() || null,
            agent_id: agentId,
            info_date: validInfoDate,
            status: "ACTIVE",
          },
          update: {
            listing_type: listingType,
            is_land: isLand,
            is_house: isHouse,
            is_mansion: isMansion,
            area,
            town,
            price,
            price_display: row[1]?.trim() || null,
            area_land_m2: areaLand,
            area_build_m2: areaBuild,
            commission: row[5]?.trim() || null,
            note,
            transaction_type: transactionType,
            seller_name: row[11]?.trim() || null,
            agent_id: agentId,
            info_date: validInfoDate,
          },
        });
        imported++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${managementNo}: ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 10),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// CSVパーサー（ダブルクォート内の改行・カンマに対応）
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuote && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      current.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && next === "\n") i++;
      current.push(cell);
      cell = "";
      if (current.some((c) => c.trim())) rows.push(current);
      current = [];
    } else {
      cell += ch;
    }
  }

  // 最終行
  if (cell || current.length) {
    current.push(cell);
    if (current.some((c) => c.trim())) rows.push(current);
  }

  return rows;
}
