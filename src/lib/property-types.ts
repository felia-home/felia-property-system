// 物件種別の定数とユーティリティ
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  MANSION:      "中古マンション",
  USED_MANSION: "中古マンション",  // エイリアス（旧データ互換）
  NEW_MANSION:  "新築マンション",
  USED_HOUSE:   "中古戸建て",
  NEW_HOUSE:    "新築戸建て",
  LAND:         "土地",
};

// マンション系（building_name や階数・管理費が意味を持つ種別）
export const MANSION_TYPES = ["MANSION", "USED_MANSION", "NEW_MANSION"] as const;

export function isMansionType(type: string | null | undefined): boolean {
  return type !== null && type !== undefined && (MANSION_TYPES as readonly string[]).includes(type);
}
