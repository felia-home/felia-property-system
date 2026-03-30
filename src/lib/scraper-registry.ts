/**
 * ハトサポシステム使用不動産会社サイト一覧
 * 競合調査・市場把握の内部管理用途のみ
 */
export const HATSUPO_SITES = [
  { name: "東宝ハウス世田谷",   domain: "toho-setagaya.co.jp" },
  { name: "東宝ハウス城東",     domain: "toho-house.jp" },
  { name: "東宝ハウス練馬",     domain: "toho-nerima.co.jp" },
  { name: "東宝ハウス府中",     domain: "toho-fuchu.co.jp" },
  { name: "フェリアホーム（自社）", domain: "felia-home.co.jp" },
] as const;

export type HatsupoSite = typeof HATSUPO_SITES[number];

/** URLからサイト名を返す（不明な場合はドメインを返す） */
export function getSiteName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return HATSUPO_SITES.find(s => domain.includes(s.domain))?.name ?? domain;
  } catch {
    return url;
  }
}

/** URLがハトサポシステム対応サイトかどうか */
export function isHatsupoSite(url: string): boolean {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return HATSUPO_SITES.some(s => domain.includes(s.domain));
  } catch {
    return false;
  }
}
