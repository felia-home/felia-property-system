import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fetchHatsupoListPage, scrapePropertyFromUrl } from "@/lib/property-scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

const FELIA_LIST_URL = "https://felia-home.co.jp/sch/sch_list.php";
const REQUEST_INTERVAL_MS = 2000; // 2秒間隔でリクエスト

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * POST /api/import/from-felia-hp
 * フェリアホームHP（ハトサポシステム）から全物件を一括取込
 * Server-Sent Events でリアルタイム進捗配信
 */
export async function POST(_request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller already closed */ }
      };

      try {
        send({ type: "status", message: "物件一覧を取得中..." });

        // Step 1: Fetch list page and collect all detail URLs
        const listResult = await fetchHatsupoListPage(FELIA_LIST_URL);
        if (!listResult.success || !listResult.items) {
          send({ type: "error", message: listResult.error ?? "一覧ページの取得に失敗しました" });
          return;
        }

        const allItems = [...(listResult.items ?? [])];

        // Fetch additional pages if any
        if ((listResult.totalPages ?? 1) > 1) {
          for (let page = 2; page <= Math.min(listResult.totalPages!, 20); page++) {
            await sleep(REQUEST_INTERVAL_MS);
            const pageResult = await fetchHatsupoListPage(`${FELIA_LIST_URL}?page=${page}`);
            if (pageResult.success && pageResult.items) {
              allItems.push(...pageResult.items);
            }
          }
        }

        const total = allItems.length;
        send({ type: "total", total, message: `${total}件の物件を検出しました` });

        if (total === 0) {
          send({ type: "done", created: 0, updated: 0, skipped: 0 });
          return;
        }

        let created = 0, updated = 0, skipped = 0;

        // Step 2: Scrape each detail page
        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          await sleep(REQUEST_INTERVAL_MS);

          try {
            const result = await scrapePropertyFromUrl(item.detailUrl);
            if (!result.success || !result.data) {
              skipped++;
              send({ type: "progress", index: i + 1, total, status: "error", message: `スキップ: ${item.kNumber}` });
              continue;
            }

            const prop = result.data;
            if (!prop.property_type || (!prop.price && !prop.city)) {
              skipped++;
              send({ type: "progress", index: i + 1, total, status: "skipped", message: `データ不足: ${item.kNumber}` });
              continue;
            }

            // Upsert by legacy_id (k_number)
            const legacyId = item.kNumber;
            const { image_urls: _imgs, road_situation: _road, legacy_id: _lid, ...dbProp } = prop;
            const saveData = {
              ...dbProp,
              legacy_id: legacyId,
              source: "felia_hp_import",
              prefecture: dbProp.prefecture ?? "東京都",
              transaction_type: "仲介",
              brokerage_type: "専任",
            };

            const existing = await prisma.property.findFirst({ where: { legacy_id: legacyId } });
            const label = `${dbProp.city ?? ""}${dbProp.town ?? ""} ${dbProp.property_type ?? ""} ${dbProp.price ? dbProp.price + "万円" : ""}`.trim();

            if (existing) {
              await prisma.property.update({ where: { id: existing.id }, data: saveData });
              updated++;
              send({ type: "progress", index: i + 1, total, status: "updated", message: `更新: ${label}` });
            } else {
              await prisma.property.create({ data: saveData as Parameters<typeof prisma.property.create>[0]["data"] });
              created++;
              send({ type: "progress", index: i + 1, total, status: "created", message: `登録: ${label}` });
            }
          } catch (err) {
            skipped++;
            send({ type: "progress", index: i + 1, total, status: "error", message: `エラー: ${item.kNumber} — ${err instanceof Error ? err.message : String(err)}` });
          }
        }

        send({ type: "done", created, updated, skipped, total });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "不明なエラー" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
