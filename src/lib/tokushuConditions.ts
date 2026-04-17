// src/lib/tokushuConditions.ts

export interface TokushuConditions {
  flags?: TokushuFlag[];
  areas?: string[];
  property_types?: string[];
  price_min?: number | null;
  price_max?: number | null;
  photo_min?: number | null;
}

export type TokushuFlag =
  | 'is_felia_selection'
  | 'is_open_house';

export type SortType =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'area_asc';

export const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'newest',     label: '新着順' },
  { value: 'price_asc',  label: '価格安い順' },
  { value: 'price_desc', label: '価格高い順' },
  { value: 'area_asc',   label: '面積広い順' },
];

export const FLAG_OPTIONS: { value: TokushuFlag; label: string }[] = [
  { value: 'is_felia_selection', label: 'フェリアセレクション' },
  { value: 'is_open_house',      label: 'オープンハウスあり' },
];

export const AREA_OPTIONS: string[] = [
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区',
  '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区',
  '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区',
  '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区',
  '八王子市', '立川市', '武蔵野市', '三鷹市', '府中市', '調布市',
];

export const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NEW_HOUSE',    label: '新築戸建て' },
  { value: 'USED_HOUSE',   label: '中古戸建て' },
  { value: 'MANSION',      label: 'マンション' },
  { value: 'NEW_MANSION',  label: '新築マンション' },
  { value: 'LAND',         label: '土地' },
];

export function buildWhereFromConditions(conditions: TokushuConditions) {
  const where: Record<string, unknown> = {
    published_hp: true,
    is_deleted: false,
  };

  if (conditions.flags && conditions.flags.length > 0) {
    for (const flag of conditions.flags) {
      where[flag] = true;
    }
  }

  if (conditions.areas && conditions.areas.length > 0) {
    where['city'] = { in: conditions.areas };
  }

  if (conditions.property_types && conditions.property_types.length > 0) {
    where['property_type'] = { in: conditions.property_types };
  }

  if (conditions.price_min != null || conditions.price_max != null) {
    where['price'] = {
      ...(conditions.price_min != null ? { gte: conditions.price_min } : {}),
      ...(conditions.price_max != null ? { lte: conditions.price_max } : {}),
    };
  }

  if (conditions.photo_min != null && conditions.photo_min > 0) {
    where['images'] = { some: {} };
  }

  return where;
}

export function buildOrderByFromSortType(sortType: SortType) {
  switch (sortType) {
    case 'price_asc':  return [{ price: 'asc'  as const }];
    case 'price_desc': return [{ price: 'desc' as const }];
    case 'area_asc':   return [{ area_build_m2: 'desc' as const }];
    case 'newest':
    default:           return [{ created_at: 'desc' as const }];
  }
}
