import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// 住所から区名と町名を分離
function splitAddress(address: string): { area: string; area_town: string } {
  const match = address.match(/^([^\s]+?[区市町村])(.*)/);
  if (match) {
    return {
      area:      match[1].trim(),
      area_town: match[2].trim(),
    };
  }
  return { area: address, area_town: "" };
}

// 国土地理院APIで丁目レベルまで座標取得
async function geocodeToChome(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const chome = address.replace(/(\d+丁目).*$/, "$1");
    const query = encodeURIComponent("東京都" + chome);
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${query}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as { geometry?: { coordinates?: [number, number] } }[];
    if (Array.isArray(data) && data.length > 0 && data[0]?.geometry?.coordinates) {
      const [lng, lat] = data[0].geometry.coordinates;
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

// year_month を「YYYY年M月」のような表示文字列のまま受け取り、sale_year/sale_month を抽出
function parseYearMonth(s: string): { sale_year: number | null; sale_month: number | null } {
  const m = s.match(/(\d{4})\D+(\d{1,2})/);
  if (!m) return { sale_year: null, sale_month: null };
  return { sale_year: parseInt(m[1]), sale_month: parseInt(m[2]) };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await req.json() as { rows?: string[][] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "データが空です" }, { status: 400 });
    }

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;
    const errorDetails: string[] = [];

    for (const row of rows) {
      // ヘッダー行スキップ
      if (!row[0] || row[0] === "公開日" || row[0] === "published_at") {
        skipped++;
        continue;
      }

      try {
        const published_at  = (row[0] ?? "").trim();
        const year_month    = (row[1] ?? "").trim();
        const property_type = (row[2] ?? "").trim();
        const address       = (row[3] ?? "").trim();

        if (!year_month || !property_type || !address) {
          skipped++;
          continue;
        }

        const { area, area_town } = splitAddress(address);
        const { sale_year, sale_month } = parseYearMonth(year_month);

        // 丁目レベルで座標取得
        const fullAddress = area + area_town;
        const coords = await geocodeToChome(fullAddress);

        // レート制限対策
        await new Promise(r => setTimeout(r, 300));

        await prisma.saleResult.create({
          data: {
            year_month,
            sale_year,
            sale_month,
            area,
            area_ward:     area || null,
            area_town:     area_town || null,
            property_type,
            is_active:     true,
            latitude:      coords?.lat ?? null,
            longitude:     coords?.lng ?? null,
            // 公開日を sort_order に使う想定はないが、新しいものを上に並べたいときのため
            // published_at は SaleResult スキーマに無いので無視（保存対象外）
          },
        });
        // published_at は SaleResult に既存カラムが無いため捨てる
        void published_at;
        inserted++;
      } catch (err) {
        errors++;
        errorDetails.push(`行${inserted + skipped + errors}: ${String(err).slice(0, 80)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      errors,
      total: rows.length,
      error_details: errorDetails.slice(0, 5),
    });
  } catch (error) {
    console.error("sale-results import error:", error);
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
