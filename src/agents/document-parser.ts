/**
 * DocumentParserAgent
 * 販売図面PDF・物件画像から構造化データを自動抽出するエージェント
 *
 * 使用方法:
 *   const result = await parseDocument({ url: "s3://...", type: "pdf" });
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

// ============================================================
// 型定義
// ============================================================

export type SourceType = "pdf" | "image";
export type Confidence = "high" | "medium" | "low";

export interface ParseInput {
  url: string;             // S3 URL or ローカルパス
  type: SourceType;
  property_id?: string;   // 既存物件に紐付ける場合
}

export interface ExtractedProperty {
  property_type?: string;
  price?: number;
  address?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  address_detail?: string;
  station_line1?: string;
  station_name1?: string;
  station_walk1?: number;
  station_line2?: string;
  station_name2?: string;
  station_walk2?: number;
  // legacy single-field names (kept for backward compat)
  station_line?: string;
  station_name?: string;
  station_walk?: number;
  area_land_m2?: number;
  area_build_m2?: number;
  area_exclusive_m2?: number;
  rooms?: string;
  building_year?: number;
  building_month?: number;
  structure?: string;
  floors_total?: number;
  floor_unit?: number;
  direction?: string;
  delivery_timing?: string;
  reins_number?: string;
  bcr?: number;
  far?: number;
  management_fee?: number;
  repair_reserve?: number;
  total_units?: number;
  city_plan?: string;
  use_zone?: string;
  use_zones?: Array<{ use_zone: string; bcr: number; far: number }>;
  roads?: Array<{ direction: string; road_type: string; width_m: number; is_front: boolean }>;
  land_right?: string;
  land_category?: string;
  private_road?: boolean;
  features?: string[];
  equipment_list?: string[];
  // 売主・元付業者情報（内部管理・非公開）
  seller_company?: string;
  seller_contact?: string;
  seller_transaction_type?: string;
  seller_brokerage_type?: string;
  our_transaction_type?: string;
  ad_transfer_ok?: boolean;
  current_status?: string;
}

export interface ParseResult {
  success: boolean;
  source_type: SourceType;
  source_url: string;
  extracted: ExtractedProperty;
  confidence: Partial<Record<keyof ExtractedProperty, Confidence>>;
  needs_review: string[];       // 要確認フィールド
  low_confidence_fields: string[]; // 精度低フィールド
  raw_text: string;
  error?: string;
  agent: "DocumentParserAgent";
  generated?: GeneratedContent;  // AI自動生成コンテンツ
}

// ============================================================
// ファイル読み込み（ローカル or S3）
// ============================================================

async function loadFileAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  // S3 URLの場合はAWS SDKで取得（実装時に追加）
  // ローカルパスの場合
  if (url.startsWith("s3://")) {
    throw new Error("S3取得は別途AWS SDK実装が必要です: " + url);
  }

  const ext = path.extname(url).toLowerCase();
  const data = fs.readFileSync(url);
  const base64 = data.toString("base64");
  const mediaType = ext === ".pdf" ? "application/pdf"
    : ext === ".png" ? "image/png"
    : "image/jpeg";

  return { data: base64, mediaType };
}

// ============================================================
// メインの抽出処理
// ============================================================

export async function parseDocument(input: ParseInput): Promise<ParseResult> {
  const prompt = buildExtractionPrompt();

  try {
    const { data, mediaType } = await loadFileAsBase64(input.url);

    // PDF は document型、画像は image型で送信
    const contentBlock = mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png", data },
        };

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // needs_review: confidence が low のフィールドを自動リストアップ
    const needsReview: string[] = [];
    const lowConfidenceFields: string[] = [];

    for (const [field, conf] of Object.entries(parsed.confidence || {})) {
      if (conf === "low") {
        needsReview.push(field);
        lowConfidenceFields.push(field);
      } else if (conf === "medium") {
        needsReview.push(field);
      }
    }

    // 必須フィールドが抽出できていない場合も追加
    const requiredFields: (keyof ExtractedProperty)[] = [
      "price", "station_name", "station_walk", "property_type",
    ];
    for (const field of requiredFields) {
      if (!parsed.extracted?.[field] && !needsReview.includes(field)) {
        needsReview.push(field + "（未取得・必須項目）");
      }
    }

    // ログ出力
    process.stdout.write(JSON.stringify({
      level: "info",
      agent: "DocumentParserAgent",
      source: input.url,
      extracted_fields: Object.keys(parsed.extracted || {}).length,
      needs_review_count: needsReview.length,
      timestamp: new Date().toISOString(),
    }) + "\n");

    // AI コンテンツ自動生成（失敗してもパース結果は返す）
    let generated: GeneratedContent | undefined;
    try {
      generated = await generatePropertyContent(parsed.extracted || {});
    } catch (genError) {
      process.stderr.write(JSON.stringify({
        level: "warn",
        agent: "DocumentParserAgent",
        message: "generatePropertyContent failed",
        error: genError instanceof Error ? genError.message : String(genError),
        timestamp: new Date().toISOString(),
      }) + "\n");
    }

    return {
      success: true,
      source_type: input.type,
      source_url: input.url,
      extracted: parsed.extracted || {},
      confidence: parsed.confidence || {},
      needs_review: needsReview,
      low_confidence_fields: lowConfidenceFields,
      raw_text: parsed.raw_text || "",
      agent: "DocumentParserAgent",
      generated,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";

    process.stderr.write(JSON.stringify({
      level: "error",
      agent: "DocumentParserAgent",
      source: input.url,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }) + "\n");

    return {
      success: false,
      source_type: input.type,
      source_url: input.url,
      extracted: {},
      confidence: {},
      needs_review: [],
      low_confidence_fields: [],
      raw_text: "",
      error: errorMessage,
      agent: "DocumentParserAgent",
    };
  }
}

// ============================================================
// AI コンテンツ自動生成
// ============================================================

export interface GeneratedContent {
  title: string;
  catch_copy: string;
  description_hp: string;
  description_portal: string;
  eq_summary: string;
}

export async function generatePropertyContent(
  extracted: ExtractedProperty
): Promise<GeneratedContent> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `あなたはフェリアホーム（東京都心・城南・城西エリア専門の不動産仲介会社）の優秀な物件担当者です。以下の物件情報を元に各テキストを生成してください。

## 物件情報
${JSON.stringify(extracted, null, 2)}

## 生成してください（JSON形式で返答）
{
  "title": "物件のタイトル（例: 目黒区平町2丁目 中古戸建｜東急東横線 代官山駅 徒歩8分 3LDK）",
  "catch_copy": "キャッチコピー（40文字以内・購買意欲を高める・具体的な魅力を訴求）",
  "description_hp": "HP掲載文（300〜500文字・エリアの特性・生活環境・物件の強みを具体的に）",
  "description_portal": "ポータルサイト掲載文（200〜300文字・簡潔で検索にヒットしやすい）",
  "eq_summary": "設備まとめ（「システムキッチン・食洗機・床暖房完備」のような形式）"
}

## 生成ルール
- 不動産公正競争規約を遵守（最上級表現・絶対的表現は使わない）
- 「最高」「絶対」「業界最安値」等の誇大表現は禁止
- エリアの具体的な魅力を入れる
- 価格・面積・駅距離などの数値は正確に記載
- JSONのみ返答（前置きや説明は不要）`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned) as GeneratedContent;
  } catch {
    return {
      title: "",
      catch_copy: "",
      description_hp: "",
      description_portal: "",
      eq_summary: "",
    };
  }
}

// ============================================================
// 抽出プロンプト
// ============================================================

function buildExtractionPrompt(): string {
  return `
あなたは不動産販売図面・物件資料の専門的な解析AIです。
添付された画像/PDFから物件情報を漏れなく抽出してください。

## 最重要: 売主・元付業者情報の抽出

販売図面には必ず以下のいずれかの形式で不動産会社情報が記載されています。
**これを見落とさず必ず抽出してください。**

### 探すべき情報の場所
1. 図面の右下・左下・下部フッター部分
2. 「問い合わせ先」「お問合せ」「取扱会社」セクション
3. 会社のロゴ・社名が印刷されている部分
4. 「媒介」「取引態様」と一緒に記載されている会社名
5. 電話番号・FAX番号の近く

### 抽出する情報
- 会社名（例: 株式会社〇〇不動産、〇〇ホーム 渋谷店）
- 電話番号・FAX番号
- 担当者名（記載があれば）
- 宅建業免許番号（記載があれば）
- 取引態様（専任媒介・専属専任媒介・一般媒介・売主・代理）

### 重要な区別
- この情報は「元付業者（販売図面を作成した不動産会社）」の情報です
- フェリアホーム（買付け側）の取引態様は必ず「仲介」として our_transaction_type に設定
- 図面記載の取引態様は seller_transaction_type に設定

---

## 全項目の抽出ルール

### 価格
- 「販売価格」「売出価格」「価格」の数値を抽出（万円単位）

### 所在地
- 都道府県・市区町村・町名・丁目を分離
- 番地以降は address_detail に格納（内部管理・公開不可）
- 丁目まで（番地なし）を town に格納

### 交通
- 「交通」「アクセス」セクションから最大3路線分
- station_line1/name1/walk1, station_line2/name2/walk2, station_line3/name3/walk3 で格納

### 面積
- 土地面積・建物面積・専有面積を㎡単位で数値として抽出
- 「約◯◯㎡」の「約」は除いて数値のみ

### 用途地域・接道
- 複数の用途地域が記載されている場合は use_zones 配列で全て抽出
- 接道状況は roads 配列で格納（方向・道路種別・幅員）

### 設備
- 設備一覧・仕様一覧から全項目を equipment_list 配列で抽出

---

## 返却JSON形式（このJSONのみ出力。前置き・説明不要）

{
  "extracted": {
    "property_type": "NEW_HOUSE|USED_HOUSE|MANSION|NEW_MANSION|LAND",
    "price": 8280,
    "prefecture": "東京都",
    "city": "目黒区",
    "town": "平町2丁目",
    "address_detail": "3番15号",
    "building_name": null,
    "station_line1": "東急東横線",
    "station_name1": "都立大学",
    "station_walk1": 8,
    "station_line2": null,
    "station_name2": null,
    "station_walk2": null,
    "area_land_m2": 120.5,
    "area_build_m2": 90.64,
    "area_exclusive_m2": null,
    "building_year": 2015,
    "building_month": 3,
    "structure": "木造",
    "floors_total": 2,
    "floor_unit": null,
    "direction": "南",
    "rooms": "3LDK",
    "use_zone": "第一種低層住居専用地域",
    "use_zones": [{"use_zone": "第一種低層住居専用地域", "bcr": 40, "far": 80}],
    "bcr": 40,
    "far": 80,
    "roads": [{"direction": "南", "road_type": "公道", "width_m": 6.0, "is_front": true}],
    "land_right": "所有権",
    "city_plan": "市街化区域",
    "management_fee": null,
    "repair_reserve": null,
    "total_units": null,
    "delivery_timing": "即時",
    "current_status": "空家",
    "reins_number": "3001234567",
    "our_transaction_type": "仲介",
    "seller_company": "株式会社〇〇不動産 目黒店",
    "seller_contact": "03-1234-5678",
    "seller_transaction_type": "専任媒介",
    "seller_brokerage_type": "専任",
    "ad_transfer_ok": true,
    "equipment_list": ["システムキッチン", "食洗機", "床暖房", "追い焚き", "浴室乾燥機"],
    "features": ["南向き", "角地", "駐車場2台"]
  },
  "confidence": {
    "price": "high",
    "seller_company": "high",
    "address": "high",
    "station_walk1": "high",
    "reins_number": "low"
  },
  "raw_text": "資料から読み取ったテキスト全文（売主会社名・電話番号を含む）",
  "raw_notes": "図面下部に会社名あり。電話番号が2つ記載（本社・支店）"
}

## 確信度の基準
- high: はっきりと数値・文字が読み取れた
- medium: 読み取れたが表記揺れや計算が必要だった
- low: 推測が含まれる・複数候補がある・読み取り困難だった

## 重要なルール
- 読み取れなかったフィールドはJSONに含めない（null にしない）
- 単位は除去して数値のみ（例: "8,500万円" → 8500）
- 徒歩分数は表記通りの数値（自分で計算しない）
- 間取りは "3LDK" "4LDK" など標準表記に統一
- 複数の値が考えられる場合は confidence を "low" にする
`;
}

// ============================================================
// 使用例（開発・テスト用）
// ============================================================

if (require.main === module) {
  // テスト用：ローカルのサンプルPDFを解析
  const testFile = process.argv[2];
  if (!testFile) {
    console.log("使用方法: ts-node document-parser.ts <PDFまたは画像のパス>");
    process.exit(1);
  }

  const ext = path.extname(testFile).toLowerCase();
  const sourceType: SourceType = ext === ".pdf" ? "pdf" : "image";

  parseDocument({ url: testFile, type: sourceType }).then((result) => {
    if (result.success) {
      console.log("\n=== 抽出結果 ===\n");
      console.log("抽出データ:");
      console.log(JSON.stringify(result.extracted, null, 2));
      console.log("\n要確認項目:");
      result.needs_review.forEach((f) => console.log(`  ⚠ ${f}`));
    } else {
      console.error("抽出失敗:", result.error);
    }
  });
}
