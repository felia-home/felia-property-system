import { prisma } from "@/lib/db";

// 苗字 → ローマ字変換マップ
const LAST_NAME_MAP: Record<string, string> = {
  "北原": "kitahara", "伊藤": "ito", "長田": "nagata", "表": "omote",
  "齋藤": "saito", "齐藤": "saito", "安井": "yasui", "中田": "nakada",
  "加藤": "kato", "松本": "matsumoto", "波多": "hata", "中塚": "nakatsuka",
  "渡邉": "watanabe", "渡辺": "watanabe", "阿部": "abe", "星": "hoshi",
  "小川": "ogawa", "田中": "tanaka", "山田": "yamada", "鈴木": "suzuki",
  "佐藤": "sato", "高橋": "takahashi", "斉藤": "saito", "中村": "nakamura",
  "林": "hayashi", "吉田": "yoshida", "山口": "yamaguchi", "大野": "ono",
  "木村": "kimura", "清水": "shimizu", "池田": "ikeda", "斎藤": "saito",
  "橋本": "hashimoto", "山本": "yamamoto", "石川": "ishikawa", "藤田": "fujita",
  "松": "matsu", "岡田": "okada", "後藤": "goto", "近藤": "kondo",
  "村田": "murata", "坂本": "sakamoto", "中島": "nakashima", "原田": "harada",
  "小林": "kobayashi", "西村": "nishimura", "福田": "fukuda", "上田": "ueda",
  "長谷川": "hasegawa", "岩田": "iwata", "内田": "uchida", "前田": "maeda",
};

// 名前の頭文字 → ローマ字変換
const FIRST_NAME_MAP: Record<string, string> = {
  "啓": "k", "貴": "t", "光": "k", "来": "r", "大": "d",
  "孝": "k", "真": "m", "遼": "r", "祐": "y", "隆": "r",
  "雅": "m", "圭": "k", "楠": "n", "俊": "t", "一": "k",
  "二": "j", "三": "m", "四": "y", "太": "t", "健": "k",
  "浩": "h", "博": "h", "誠": "m", "修": "o", "正": "m",
  "哲": "t", "豊": "y", "信": "n", "仁": "h", "義": "y",
  "龍": "r", "和": "k", "勇": "y", "剛": "g", "翔": "s",
  "蓮": "r", "颯": "s", "大輔": "d", "啓輔": "k", "貴洋": "t",
  "光平": "k", "来希": "r", "孝輔": "k", "真矢": "m", "遼太朗": "r",
  "祐輔": "y", "隆二": "r", "雅人": "m", "圭介": "k", "楠央": "n",
  "俊彦": "t",
};

/** ひらがな/カタカナ名 → ローマ字頭文字 */
function kanaToRomajiInitial(char: string): string {
  const map: Record<string, string> = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "k", "き": "k", "く": "k", "け": "k", "こ": "k",
    "さ": "s", "し": "s", "す": "s", "せ": "s", "そ": "s",
    "た": "t", "ち": "t", "つ": "t", "て": "t", "と": "t",
    "な": "n", "に": "n", "ぬ": "n", "ね": "n", "の": "n",
    "は": "h", "ひ": "h", "ふ": "h", "へ": "h", "ほ": "h",
    "ま": "m", "み": "m", "む": "m", "め": "m", "も": "m",
    "や": "y", "ゆ": "y", "よ": "y",
    "ら": "r", "り": "r", "る": "r", "れ": "r", "ろ": "r",
    "わ": "w", "を": "w",
    "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
    "カ": "k", "キ": "k", "ク": "k", "ケ": "k", "コ": "k",
    "サ": "s", "シ": "s", "ス": "s", "セ": "s", "ソ": "s",
    "タ": "t", "チ": "t", "ツ": "t", "テ": "t", "ト": "t",
    "ナ": "n", "ニ": "n", "ヌ": "n", "ネ": "n", "ノ": "n",
    "ハ": "h", "ヒ": "h", "フ": "h", "ヘ": "h", "ホ": "h",
    "マ": "m", "ミ": "m", "ム": "m", "メ": "m", "モ": "m",
    "ヤ": "y", "ユ": "y", "ヨ": "y",
    "ラ": "r", "リ": "r", "ル": "r", "レ": "r", "ロ": "r",
    "ワ": "w",
  };
  return map[char] ?? char.toLowerCase().charAt(0);
}

/** 苗字 → ローマ字変換（マップになければカナ読みをフォールバックとして使う） */
function lastNameToRomaji(lastName: string, nameKana?: string | null): string {
  if (LAST_NAME_MAP[lastName]) return LAST_NAME_MAP[lastName];
  // カナから生成
  if (nameKana) {
    const parts = nameKana.split(/[\s　]+/);
    const kana = parts[0];
    // 簡易変換: 先頭文字のみ
    return kana.toLowerCase().replace(/[^\w]/g, "").slice(0, 8) || lastName;
  }
  return lastName;
}

/** 名前の頭文字 → ローマ字 */
function firstNameInitial(firstName: string, nameKana?: string | null): string {
  // 複数文字（遼太朗など）から先に探す
  for (const [key, val] of Object.entries(FIRST_NAME_MAP)) {
    if (firstName.startsWith(key)) return val;
  }
  // 1文字
  if (FIRST_NAME_MAP[firstName[0]]) return FIRST_NAME_MAP[firstName[0]];
  // カナから
  if (nameKana) {
    const parts = nameKana.split(/[\s　]+/);
    const firstKana = parts[1] ?? parts[0];
    if (firstKana) return kanaToRomajiInitial(firstKana[0]);
  }
  return firstName[0]?.toLowerCase() ?? "x";
}

/**
 * スタッフコードを生成する。
 * - 同姓なし: 苗字ローマ字（例: kato）
 * - 同姓あり: 名前頭文字.苗字（例: r.kato）
 * - それでも被る: 頭文字2.苗字（例: r2.kato）
 */
export async function generateStaffCode(staffId: string): Promise<string> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { name: true, name_kana: true, staff_code: true },
  });
  if (!staff) throw new Error("スタッフが見つかりません");

  const nameParts = staff.name.split(/[\s　]+/);
  const lastName = nameParts[0];
  const firstName = nameParts[1] ?? "";
  const kanaStr = staff.name_kana ?? null;

  const lastRomaji = lastNameToRomaji(lastName, kanaStr);

  // 同姓チェック（自分以外・在籍中）
  const sameLastName = await prisma.staff.findMany({
    where: {
      name: { startsWith: lastName },
      id: { not: staffId },
      is_active: true,
    },
    select: { id: true },
  });

  if (sameLastName.length === 0) {
    return lastRomaji;
  }

  // 同姓あり → 名前の頭文字を付ける
  const initial = firstNameInitial(firstName, kanaStr);
  const candidate = `${initial}.${lastRomaji}`;

  // 被りチェック
  const conflict = await prisma.staff.findFirst({
    where: { staff_code: candidate, id: { not: staffId } },
  });
  if (!conflict) return candidate;

  // さらに被る → 番号付き
  for (let n = 2; n <= 9; n++) {
    const c = `${initial}${n}.${lastRomaji}`;
    const c2 = await prisma.staff.findFirst({
      where: { staff_code: c, id: { not: staffId } },
    });
    if (!c2) return c;
  }

  // それでも解決しない場合はタイムスタンプで一意にする
  return `${initial}.${lastRomaji}.${Date.now().toString(36).slice(-4)}`;
}

/**
 * 物件番号を生成する: {staffCode}-{3桁連番}
 * 例: r.kato-001, r.kato-002
 */
export async function generatePropertyNumber(staffCode: string): Promise<string> {
  const existing = await prisma.property.findMany({
    where: { property_number: { startsWith: `${staffCode}-` } },
    select: { property_number: true },
  });

  let maxSeq = 0;
  for (const p of existing) {
    if (!p.property_number) continue;
    const parts = p.property_number.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${staffCode}-${nextSeq}`;
}
