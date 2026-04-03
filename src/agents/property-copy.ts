/**
 * PropertyCopyAgent
 * ライフスタイル別訴求文・周辺環境サマリーを生成するエージェント
 * 写真AI分析結果を活用してより具体的なHP掲載文を生成
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface PhotoContext {
  room_type: string;
  ai_pr_text: string;
}

// Build a photo summary string from PropertyImage AI analysis results
export function buildPhotoContext(photos: PhotoContext[]): string {
  if (!photos.length) return "";
  const grouped: Record<string, string[]> = {};
  for (const p of photos) {
    if (!p.ai_pr_text) continue;
    if (!grouped[p.room_type]) grouped[p.room_type] = [];
    grouped[p.room_type].push(p.ai_pr_text);
  }
  return Object.entries(grouped)
    .map(([type, texts]) => `[${type}] ${texts[0]}`)
    .join("\n");
}

export interface LifestyleContent {
  family_appeal: string;
  dinks_appeal: string;
  investment_appeal: string;
  comparison_text: string;
}

export interface EnvironmentSummary {
  life_convenience: string;
  education: string;
  commute: string;
  safety: string;
}

type PropertyInput = Record<string, unknown>;

export async function generateLifestyleContent(
  property: PropertyInput,
  photos?: PhotoContext[]
): Promise<LifestyleContent> {
  const photoSection = photos?.length
    ? `\n## 写真AI分析結果（これらを訴求文に自然に組み込んでください）\n${buildPhotoContext(photos)}\n`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `あなたはフェリアホームの物件コピーライターです。以下の物件情報から、ライフスタイル別の訴求文を生成してください。

## 物件情報
${JSON.stringify(property, null, 2)}
${photoSection}
## 生成形式（JSONのみ返答）
{
  "family_appeal": "ファミリー向け訴求文（150文字以内・子育て環境・広さ・収納・学区など）",
  "dinks_appeal": "DINKS・共働きカップル向け訴求文（150文字以内・利便性・デザイン性・通勤など）",
  "investment_appeal": "投資・資産価値訴求文（100文字以内・立地・希少性・将来性など）",
  "comparison_text": "相場比較コメント（100文字以内・「このエリアの相場と比較して〇〇」という形式）"
}

## ルール
- 不動産公正競争規約を遵守（誇大広告・絶対的表現禁止）
- 具体的な数値・固有名詞を使って説得力を出す
- JSONのみ返答`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as LifestyleContent;
  } catch {
    return {
      family_appeal: "",
      dinks_appeal: "",
      investment_appeal: "",
      comparison_text: "",
    };
  }
}

export interface PropertyCopy {
  title: string;
  catch_copy: string;
  description_hp: string;
  description_suumo: string;
  description_athome: string;
  selling_points: string[];
}

export async function generatePropertyCopy(
  property: PropertyInput,
  photos?: PhotoContext[]
): Promise<PropertyCopy> {
  const photoSection = photos?.length
    ? `\n## 写真AI分析結果（訴求文に自然に組み込んでください）\n${buildPhotoContext(photos)}\n`
    : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `あなたはフェリアホームの不動産広告コピーライターです。以下の物件情報から、各掲載先向けの広告文を生成してください。

## 物件情報
${JSON.stringify(property, null, 2)}
${photoSection}
## 生成形式（JSONのみ返答）
{
  "title": "物件タイトル（50文字以内・物件種別・エリア・特徴を含む）",
  "catch_copy": "キャッチコピー（40文字以内・感情に訴える一文・！や？は使わない）",
  "description_hp": "HP掲載文（400〜600文字・生活シーン・周辺環境・建物の魅力を詳しく・段落分け可）",
  "description_suumo": "SUUMO掲載文（200〜300文字・箇条書き不可・スペック重視・簡潔に）",
  "description_athome": "at home掲載文（200〜300文字・ファミリー・DINKSを意識・温かみのある文体）",
  "selling_points": ["セールスポイント1（20文字以内）", "セールスポイント2（20文字以内）", "セールスポイント3（20文字以内）", "セールスポイント4（20文字以内）", "セールスポイント5（20文字以内）"]
}

## ルール
- 不動産公正競争規約を遵守（「最高」「完璧」等の最上級表現禁止、根拠のない断定禁止）
- 物件情報に記載のある事実のみ記述（推測で情報を作らない）
- 交通は「○○線○○駅 徒歩○分」の形式で明記（80m/分換算）
- 価格・面積・築年等の数値は正確に記載
- selling_pointsは必ず5項目・各20文字以内
- JSONのみ返答（前後にテキスト不要）`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as PropertyCopy;
  } catch {
    return {
      title: "",
      catch_copy: "",
      description_hp: "",
      description_suumo: "",
      description_athome: "",
      selling_points: [],
    };
  }
}

export async function generateEnvironmentSummary(
  property: PropertyInput
): Promise<EnvironmentSummary> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `あなたはフェリアホームの物件担当者です。以下の物件情報から周辺環境サマリーを生成してください。

## 物件情報
${JSON.stringify(property, null, 2)}

## 生成形式（JSONのみ返答）
{
  "life_convenience": "生活利便性（150文字以内・スーパー・病院・コンビニ等）",
  "education": "教育環境（100文字以内・小学校・中学校・塾等）",
  "commute": "通勤利便性（100文字以内・何線・何駅・都心まで何分等）",
  "safety": "安全性・防災（100文字以内・治安・ハザードマップ・防犯等）"
}

## ルール
- 物件に記載されている情報のみ使用（推測で固有名詞を作らない）
- 情報が不足している場合は「詳細は担当者にお問合せください」と記載
- JSONのみ返答`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as EnvironmentSummary;
  } catch {
    return {
      life_convenience: "",
      education: "",
      commute: "",
      safety: "",
    };
  }
}
