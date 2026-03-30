/**
 * 物件情報の完成度を自動チェックし、未完了タスクリストを生成
 */

export interface CheckItem {
  id: string;
  category: "基本情報" | "法令情報" | "写真" | "広告文" | "掲載設定";
  label: string;
  severity: "required" | "recommended" | "optional";
  completed: boolean;
  action?: string;
}

// Lightweight property interface — works with both Prisma records and plain objects
export interface PropertyForChecklist {
  price?: number | null;
  city?: string | null;
  town?: string | null;
  station_name1?: string | null;
  station_walk1?: number | null;
  area_land_m2?: number | null;
  area_build_m2?: number | null;
  area_exclusive_m2?: number | null;
  rooms?: string | null;
  building_year?: number | null;
  property_type?: string | null;
  structure?: string | null;
  delivery_timing?: string | null;
  use_zone?: string | null;
  bcr?: number | null;
  far?: number | null;
  road_side?: string | null;
  road_direction?: string | null;
  reins_number?: string | null;
  title?: string | null;
  catch_copy?: string | null;
  description_hp?: string | null;
  ad_confirmed_at?: Date | string | null;
  // Photo stats (populated by updatePhotoStats)
  photo_count?: number;
  photo_has_exterior?: boolean;
  photo_has_floor_plan?: boolean;
  photo_has_interior?: boolean;
  // Raw images array (optional — used if photo_* fields are not yet populated)
  images?: Array<{ room_type?: string | null }>;
}

export function generateChecklist(property: PropertyForChecklist): CheckItem[] {
  const checks: CheckItem[] = [];

  // Resolve photo data from either images array or cached stats
  const images = property.images ?? [];
  const imageCount = images.length > 0 ? images.length : (property.photo_count ?? 0);
  const hasExterior = images.length > 0
    ? images.some(i => i.room_type === "外観")
    : (property.photo_has_exterior ?? false);
  const hasFloorPlan = images.length > 0
    ? images.some(i => i.room_type === "間取り図")
    : (property.photo_has_floor_plan ?? false);
  const hasInterior = images.length > 0
    ? images.some(i => ["リビング", "キッチン", "洋室", "和室", "主寝室"].includes(i.room_type ?? ""))
    : (property.photo_has_interior ?? false);

  // ===== 基本情報チェック =====
  checks.push({ id: "price", category: "基本情報", label: "価格", severity: "required", completed: !!property.price });
  checks.push({ id: "address", category: "基本情報", label: "所在地（丁目まで）", severity: "required", completed: !!(property.city && property.town) });
  checks.push({ id: "station", category: "基本情報", label: "最寄り駅・徒歩分", severity: "required", completed: !!(property.station_name1 && property.station_walk1) });
  checks.push({
    id: "area", category: "基本情報", label: "面積（土地または建物）", severity: "required",
    completed: !!(property.area_land_m2 || property.area_build_m2 || property.area_exclusive_m2),
  });
  checks.push({ id: "rooms", category: "基本情報", label: "間取り", severity: "required", completed: !!property.rooms });
  checks.push({
    id: "building_year", category: "基本情報", label: "築年月", severity: "required",
    completed: !!property.building_year,
    action: property.property_type === "NEW_HOUSE" ? "新築の場合は完成予定年月を入力" : undefined,
  });
  checks.push({ id: "structure", category: "基本情報", label: "構造", severity: "recommended", completed: !!property.structure });
  checks.push({ id: "delivery", category: "基本情報", label: "引渡し時期", severity: "recommended", completed: !!property.delivery_timing });

  // ===== 法令情報チェック =====
  checks.push({
    id: "use_zone", category: "法令情報", label: "用途地域", severity: "required",
    completed: !!property.use_zone,
    action: "法令タブから入力してください",
  });
  checks.push({
    id: "bcr_far", category: "法令情報", label: "建ぺい率・容積率", severity: "required",
    completed: !!(property.bcr && property.far),
  });
  checks.push({
    id: "road", category: "法令情報", label: "接道状況", severity: "recommended",
    completed: !!(property.road_side || property.road_direction),
  });
  checks.push({ id: "reins", category: "法令情報", label: "レインズ番号", severity: "recommended", completed: !!property.reins_number });

  // ===== 写真チェック =====
  checks.push({
    id: "photo_count", category: "写真", label: `写真枚数（現在${imageCount}枚）`, severity: "required",
    completed: imageCount >= 5,
    action: imageCount < 5 ? `あと${5 - imageCount}枚追加してください` : undefined,
  });
  checks.push({
    id: "photo_exterior", category: "写真", label: "外観写真", severity: "required",
    completed: hasExterior,
    action: "写真管理タブから外観写真を追加してください",
  });
  checks.push({
    id: "photo_floor_plan", category: "写真", label: "間取り図", severity: "required",
    completed: hasFloorPlan,
    action: "間取り図をアップロードしてください",
  });
  checks.push({ id: "photo_interior", category: "写真", label: "室内写真（リビング・キッチン等）", severity: "recommended", completed: hasInterior });

  // ===== 広告文チェック =====
  checks.push({ id: "title", category: "広告文", label: "タイトル", severity: "required", completed: !!property.title, action: "AI生成ボタンで自動作成できます" });
  checks.push({ id: "catch_copy", category: "広告文", label: "キャッチコピー", severity: "required", completed: !!property.catch_copy, action: "AI生成ボタンで自動作成できます" });
  checks.push({ id: "description_hp", category: "広告文", label: "HP掲載文", severity: "required", completed: !!property.description_hp, action: "AI生成ボタンで自動作成できます" });

  // ===== 掲載設定チェック =====
  checks.push({
    id: "ad_confirmed", category: "掲載設定", label: "広告確認済み", severity: "required",
    completed: !!property.ad_confirmed_at,
    action: "広告確認タブから確認書を送付してください",
  });

  return checks;
}

export function calculateCompletionScore(checks: CheckItem[]): number {
  const required = checks.filter(c => c.severity === "required");
  const requiredDone = required.filter(c => c.completed);
  const recommended = checks.filter(c => c.severity === "recommended");
  const recommendedDone = recommended.filter(c => c.completed);
  if (required.length === 0) return 0;
  const requiredScore = (requiredDone.length / required.length) * 70;
  const recommendedScore = recommended.length > 0 ? (recommendedDone.length / recommended.length) * 30 : 30;
  return Math.round(requiredScore + recommendedScore);
}

export function getPendingTasks(checks: CheckItem[]): string[] {
  return checks
    .filter(c => !c.completed && c.severity === "required")
    .map(c => c.label);
}
