type PropertyForAddress = {
  prefecture?: string | null;
  city?: string | null;
  town?: string | null;
  address?: string | null;
  address_display_level?: string | null;
  address_display_custom?: string | null;
};

/** HP・ポータル向けに住所を表示レベルに応じてマスキング */
export function getPublicAddress(property: PropertyForAddress): string {
  const { city = "", town = "", address_display_level, address_display_custom } = property;
  switch (address_display_level) {
    case "city":
      return city ?? "";
    case "custom":
      return address_display_custom ?? city ?? "";
    case "town":
    default:
      return [city, town].filter(Boolean).join("").replace(/\d+番.*/, "");
  }
}

/** ポータル掲載用: 必ず丁目まで（番地・地番なし） */
export function getPortalAddress(property: PropertyForAddress): string {
  const { prefecture = "東京都", city = "", town = "" } = property;
  return [prefecture, city, town].filter(Boolean).join("");
}
