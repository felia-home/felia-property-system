/**
 * PropertyScraper — 他社不動産サイトからの物件情報取得
 *
 * 対応サイト:
 * - ハトサポシステム使用サイト（東宝ハウス各社・多数の不動産会社）
 *
 * 取得データは内部管理用途のみ。HP・ポータルには掲載しない。
 */

import { load as cheerioLoad } from "cheerio";
import type { ExtractedProperty } from "@/agents/document-parser";

export type SiteSystem = "hatsupo" | "unknown";

// ── Address parser ────────────────────────────────────────────────────────────

interface AddressParts {
  prefecture: string;
  city: string | null;
  town: string | null;
  detail: string | null;
}

function parseJapaneseAddress(address: string): AddressParts {
  const s = address.replace(/\s/g, "");

  // Prefecture
  const prefMatch = /^(東京都|神奈川県|埼玉県|千葉県|大阪府|愛知県|京都府|兵庫県|北海道|福岡県|[^\d]{2,4}[都道府県])/.exec(s);
  const prefecture = prefMatch?.[1] ?? "東京都";
  let rest = s.slice(prefecture.length);

  // City/ward (ends with 市/区/町/村)
  const cityMatch = /^(.+?[市区町村])/.exec(rest);
  const city = cityMatch?.[1] ?? null;
  if (city) rest = rest.slice(city.length);

  // Town: up to and including 丁目, then the rest is detail
  const chomeMatch = /^([^\d]*\d+丁目)(.*)$/.exec(rest);
  if (chomeMatch) {
    return { prefecture, city, town: chomeMatch[1], detail: chomeMatch[2].trim() || null };
  }

  // No 丁目: take leading kanji/kana as town, numbers as detail
  const noChomeMatch = /^([^\d]+)(\d.*)?$/.exec(rest);
  if (noChomeMatch) {
    return { prefecture, city, town: noChomeMatch[1].trim() || null, detail: noChomeMatch[2]?.trim() || null };
  }

  return { prefecture, city, town: rest.trim() || null, detail: null };
}

// ── Station parser ────────────────────────────────────────────────────────────

interface StationInfo {
  line: string | null;
  name: string;
  walk: number | null;
}

function parseStationInfo(traffic: string): StationInfo[] {
  const lines = traffic.split(/[\n\r\u3000]/).map(s => s.trim()).filter(Boolean);
  return lines
    .map(line => {
      // Pattern: "東急東横線「中目黒」駅 徒歩5分" or "JR山手線 目黒駅 徒歩10分"
      const quoteMatch = line.match(/(.+?)「(.+?)」駅(?:.*?徒歩(\d+)分)?/);
      const noQuoteMatch = line.match(/(.+?)(\S+)駅(?:.*?徒歩(\d+)分)?/);
      if (quoteMatch) {
        return { line: quoteMatch[1].trim() || null, name: quoteMatch[2], walk: quoteMatch[3] ? parseInt(quoteMatch[3]) : null };
      }
      if (noQuoteMatch) {
        return { line: noQuoteMatch[1].trim() || null, name: noQuoteMatch[2], walk: noQuoteMatch[3] ? parseInt(noQuoteMatch[3]) : null };
      }
      return null;
    })
    .filter((s): s is StationInfo => s !== null)
    .slice(0, 3);
}

// ── Property type detection ───────────────────────────────────────────────────

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "新築一戸建": "NEW_HOUSE", "新築戸建": "NEW_HOUSE", "新築": "NEW_HOUSE",
  "中古一戸建": "USED_HOUSE", "中古戸建": "USED_HOUSE", "中古住宅": "USED_HOUSE",
  "中古マンション": "MANSION", "マンション": "MANSION",
  "新築マンション": "NEW_MANSION",
  "土地": "LAND", "売地": "LAND", "宅地": "LAND",
};

function detectPropertyType(text: string): string {
  for (const [k, v] of Object.entries(PROPERTY_TYPE_MAP)) {
    if (text.includes(k)) return v;
  }
  return "USED_HOUSE";
}

function parseFloors(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)階/);
  return m ? parseInt(m[1]) : null;
}

// ── System detection ──────────────────────────────────────────────────────────

export function detectSiteSystem(url: string, html: string): SiteSystem {
  if (
    html.includes("img.hs.aws.multi-use.net") ||
    html.includes("k_number=") ||
    url.includes("detail.php") ||
    url.includes("/realestate/")
  ) {
    return "hatsupo";
  }
  return "unknown";
}

// ── Hatsupo parser ────────────────────────────────────────────────────────────

export function parseHatsupoPropertyDetail(
  html: string,
  sourceUrl: string
): Partial<ExtractedProperty> & { image_urls?: string[]; road_situation?: string | null; legacy_id?: string | null } {
  const $ = cheerioLoad(html);

  // Extract all th/td pairs from tables
  const data: Record<string, string> = {};
  $("table tr, .detail-table tr, .bukken-table tr").each((_, row) => {
    const cells = $(row).find("th, td");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim().replace(/[\s　]+/g, "");
      const value = $(cells[1]).text().trim().replace(/[\s　]+/g, " ").trim();
      if (key && value) data[key] = value;
    }
  });

  // Also try dl/dt/dd pattern
  $("dl").each((_, dl) => {
    const dts = $(dl).find("dt");
    const dds = $(dl).find("dd");
    dts.each((i, dt) => {
      const key = $(dt).text().trim().replace(/[\s　]+/g, "");
      const value = $(dds.get(i) ?? "").text().trim();
      if (key && value) data[key] = value;
    });
  });

  // Price
  let price: number | null = null;
  const priceText = $("h2, h3, .price, .bukken-price, .property-price").first().text();
  const priceMatch = priceText.match(/([0-9,]+)万円/) ?? (data["価格"] || data["売価"] || "").match(/([0-9,]+)万円?/);
  if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ""));

  // Address
  const addressRaw = data["所在地"] || data["物件所在地"] || "";
  const addr = parseJapaneseAddress(addressRaw);

  // Traffic
  const trafficRaw = data["交通"] || data["アクセス"] || "";
  const stations = parseStationInfo(trafficRaw);

  // Areas
  const buildM = (data["建物面積"] || data["延床面積"] || data["床面積"] || "").match(/([0-9.]+)(?:m²|㎡|m2)/);
  const landM = (data["土地面積"] || data["敷地面積"] || "").match(/([0-9.]+)(?:m²|㎡|m2)/);
  const exclusiveM = (data["専有面積"] || "").match(/([0-9.]+)(?:m²|㎡|m2)/);

  // Build date
  const buildDateRaw = data["築年月"] || data["完成時期"] || data["建築年月"] || "";
  const buildDateM = buildDateRaw.match(/(\d{4})年(\d{1,2})月?/) ??
    buildDateRaw.match(/平成(\d+)年(\d{1,2})月?/)?.map((v, i) => i === 1 ? String(1988 + parseInt(v)) : v) as RegExpMatchArray | null;

  // Use zone / BCR / FAR
  const useZone = data["用途地域"] || null;
  const bcrFarRaw = data["建ぺい率/容積率"] || data["建ぺい率・容積率"] || data["建蔽率/容積率"] || "";
  const bcrFarM = bcrFarRaw.match(/(\d+)[%％].*?(\d+)[%％]/);

  // Images: look for hatsupo CDN images
  const images: string[] = [];
  $("img").each((_, img) => {
    const src = $(img).attr("src") || "";
    if (src.includes("img.hs.aws.multi-use.net")) {
      // Prefer full-size (_b.jpg → .jpg, _s.jpg → .jpg)
      const full = src.replace(/_[bst]\.jpg/, ".jpg");
      if (!images.includes(full)) images.push(full);
    }
  });

  // Seller / transaction info
  const sellerCompany = data["取扱会社"] || data["問い合わせ先"] || data["取り扱い店舗"] || null;
  const sellerContact = data["電話番号"] || data["TEL"] || data["連絡先"] || null;
  const transactionType = data["取引態様"] || null;
  const reinsNumber = data["管理番号"] || data["レインズ番号"] || null;

  return {
    property_type: detectPropertyType(data["物件種別"] || $("h1, .property-type").first().text()),
    price,
    prefecture: addr.prefecture,
    city: addr.city,
    town: addr.town,
    address_detail: addr.detail,
    station_line1: stations[0]?.line ?? null,
    station_name1: stations[0]?.name ?? null,
    station_walk1: stations[0]?.walk ?? null,
    station_line2: stations[1]?.line ?? null,
    station_name2: stations[1]?.name ?? null,
    station_walk2: stations[1]?.walk ?? null,
    station_line3: stations[2]?.line ?? null,
    station_name3: stations[2]?.name ?? null,
    station_walk3: stations[2]?.walk ?? null,
    area_build_m2: buildM ? parseFloat(buildM[1]) : null,
    area_land_m2: landM ? parseFloat(landM[1]) : null,
    area_exclusive_m2: exclusiveM ? parseFloat(exclusiveM[1]) : null,
    rooms: data["間取り"] || data["間取"] || null,
    building_year: buildDateM ? parseInt(buildDateM[1]) : null,
    building_month: buildDateM ? parseInt(buildDateM[2]) : null,
    structure: data["建物構造"] || data["構造"] || null,
    floors_total: parseFloors(data["階建"] || data["建物階数"]),
    floor_unit: parseFloors(data["所在階"] || data["階"]),
    direction: data["向き"] || data["主要採光面"] || null,
    land_right: data["土地権利"] || null,
    use_zone: useZone,
    bcr: bcrFarM ? parseFloat(bcrFarM[1]) : null,
    far: bcrFarM ? parseFloat(bcrFarM[2]) : null,
    land_category: data["地目"] || null,
    current_status: data["現況"] || null,
    delivery_timing: data["引渡し時期"] || data["引渡"] || null,
    seller_company: sellerCompany,
    seller_contact: sellerContact,
    seller_transaction_type: transactionType,
    our_transaction_type: "仲介",
    equipment_list: (data["設備"] || data["設備・仕様"] || "").split(/[\/・、,]/).map(s => s.trim()).filter(Boolean),
    // Extended fields
    road_situation: data["接道"] || data["接道状況"] || null,
    image_urls: images,
    legacy_id: reinsNumber,
  };
}

// ── List page parser (for bulk import) ───────────────────────────────────────

export interface HatsupoListItem {
  detailUrl: string;
  kNumber: string;
}

export function parseHatsupoListPage(html: string, baseUrl: string): HatsupoListItem[] {
  const $ = cheerioLoad(html);
  const items: HatsupoListItem[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || "";
    // Match detail.php?k_number=xxx or realestate/detail.php?k_number=xxx
    const kMatch = href.match(/k_number=([A-Z0-9]+)/i);
    if (kMatch) {
      const kNumber = kMatch[1];
      if (seen.has(kNumber)) return;
      seen.add(kNumber);

      // Resolve relative URL
      let fullUrl: string;
      try {
        fullUrl = new URL(href, baseUrl).href;
      } catch {
        fullUrl = href.startsWith("http") ? href : `${new URL(baseUrl).origin}${href.startsWith("/") ? "" : "/"}${href}`;
      }
      items.push({ detailUrl: fullUrl, kNumber });
    }
  });

  return items;
}

// ── Main scrape function ──────────────────────────────────────────────────────

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; FeliahomeResearch/1.0; internal property market research)",
  "Accept-Language": "ja,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml",
};

export async function scrapePropertyFromUrl(url: string): Promise<{
  success: boolean;
  data?: Partial<ExtractedProperty> & { image_urls?: string[]; road_situation?: string | null; legacy_id?: string | null };
  system?: SiteSystem;
  error?: string;
}> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) {
      return { success: false, error: `HTTPエラー: ${res.status} ${res.statusText}` };
    }
    const html = await res.text();
    const system = detectSiteSystem(url, html);

    if (system === "hatsupo") {
      const data = parseHatsupoPropertyDetail(html, url);
      return { success: true, data, system };
    }
    return { success: false, error: "未対応サイトです。「テキスト貼付」タブをお試しください。" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function fetchHatsupoListPage(listUrl: string): Promise<{
  success: boolean;
  items?: HatsupoListItem[];
  totalPages?: number;
  error?: string;
}> {
  try {
    const res = await fetch(listUrl, { headers: FETCH_HEADERS });
    if (!res.ok) return { success: false, error: `HTTPエラー: ${res.status}` };
    const html = await res.text();

    if (!detectSiteSystem(listUrl, html).startsWith("hatsupo") && !html.includes("k_number=")) {
      return { success: false, error: "ハトサポシステムのページが検出されませんでした" };
    }

    const items = parseHatsupoListPage(html, listUrl);

    // Detect pagination: look for page links
    const $ = cheerioLoad(html);
    let totalPages = 1;
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") || "";
      const pageMatch = href.match(/page=(\d+)/);
      if (pageMatch) totalPages = Math.max(totalPages, parseInt(pageMatch[1]));
    });

    return { success: true, items, totalPages };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
