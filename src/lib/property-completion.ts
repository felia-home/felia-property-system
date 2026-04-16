/**
 * 物件完成度を計算する共通関数
 * 一覧・詳細・APIで同じロジックを使用する
 */

export interface PropertyForCompletion {
  // 必須項目（公開条件）
  city?: string | null           // 市区町村
  station_name1?: string | null  // 最寄り駅
  price?: number | null          // 価格
  area_land_m2?: number | null   // 土地面積
  area_build_m2?: number | null  // 建物面積
  area_exclusive_m2?: number | null // 専有面積

  // 推奨項目
  use_zone?: string | null       // 用途地域
  photo_count?: number | null    // 写真枚数
  photo_has_exterior?: boolean   // 外観写真
  photo_has_floor_plan?: boolean // 間取り図
  title?: string | null          // タイトル
  catch_copy?: string | null     // キャッチコピー
  description_hp?: string | null // HP掲載文
}

export interface CompletionResult {
  score: number        // 0-100
  required: string[]   // 未入力の必須項目名
  missing: string[]    // 未入力の推奨項目名
  canPublish: boolean  // 公開可能かどうか（必須4項目が全て入力済み）
}

// 必須項目（公開に必要な最低限）
const REQUIRED_CHECKS: Array<{
  label: string;
  check: (p: PropertyForCompletion) => boolean;
}> = [
  { label: "所在地", check: (p) => !!p.city },
  { label: "最寄り駅", check: (p) => !!p.station_name1 },
  { label: "価格", check: (p) => p.price != null && Number(p.price) > 0 },
  {
    label: "面積",
    check: (p) =>
      (p.area_land_m2 != null && p.area_land_m2 > 0) ||
      (p.area_build_m2 != null && p.area_build_m2 > 0) ||
      (p.area_exclusive_m2 != null && p.area_exclusive_m2 > 0),
  },
];

// 推奨項目（完成度に影響するが公開条件ではない）
const RECOMMENDED_CHECKS: Array<{
  label: string;
  check: (p: PropertyForCompletion) => boolean;
}> = [
  { label: "用途地域", check: (p) => !!p.use_zone },
  { label: "写真（3枚以上）", check: (p) => (p.photo_count ?? 0) >= 3 },
  { label: "外観写真", check: (p) => !!p.photo_has_exterior },
  { label: "間取り図", check: (p) => !!p.photo_has_floor_plan },
  { label: "タイトル", check: (p) => !!p.title },
  { label: "キャッチコピー", check: (p) => !!p.catch_copy },
  { label: "HP掲載文", check: (p) => !!p.description_hp },
];

export function calcPropertyCompletion(
  property: PropertyForCompletion
): CompletionResult {
  const missingRequired = REQUIRED_CHECKS.filter((c) => !c.check(property)).map(
    (c) => c.label
  );
  const missingRecommended = RECOMMENDED_CHECKS.filter(
    (c) => !c.check(property)
  ).map((c) => c.label);

  const canPublish = missingRequired.length === 0;

  // 必須項目：60点満点（4項目 × 15点）
  // 推奨項目：40点満点（7項目 × 約5.7点）
  const requiredScore =
    (REQUIRED_CHECKS.length - missingRequired.length) *
    (60 / REQUIRED_CHECKS.length);
  const recommendedScore =
    (RECOMMENDED_CHECKS.length - missingRecommended.length) *
    (40 / RECOMMENDED_CHECKS.length);
  const score = Math.round(requiredScore + recommendedScore);

  return {
    score,
    required: missingRequired,
    missing: missingRecommended,
    canPublish,
  };
}
