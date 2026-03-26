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
  delivery_timing?: string;
  reins_number?: string;
  bcr?: number;
  far?: number;
  management_fee?: number;
  repair_reserve?: number;
  total_units?: number;
  city_plan?: string;
  use_zone?: string;
  private_road?: boolean;
  features?: string[];
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
// 抽出プロンプト
// ============================================================

function buildExtractionPrompt(): string {
  return `
あなたは不動産の販売図面・物件資料から情報を抽出する専門家です。
添付されたPDFまたは画像から物件情報を読み取り、以下のJSON形式で出力してください。

## 出力形式（このJSONのみ出力。前置き・説明不要）

{
  "extracted": {
    "property_type": "NEW_HOUSE|USED_HOUSE|MANSION|NEW_MANSION|LAND|OTHER",
    "price": 価格（万円・数値のみ）,
    "address": "所在地（都道府県〜番地）",
    "prefecture": "東京都",
    "city": "区市町村名",
    "station_line": "路線名",
    "station_name": "最寄駅名",
    "station_walk": 徒歩分数（数値のみ）,
    "area_land_m2": 土地面積（㎡・数値のみ）,
    "area_build_m2": 建物面積（㎡・数値のみ）,
    "area_exclusive_m2": 専有面積（㎡・マンション用）,
    "rooms": "間取り（例: 3LDK）",
    "building_year": 築年（西暦・数値のみ）,
    "building_month": 築月（数値のみ）,
    "structure": "構造（例: 木造2階建）",
    "floors_total": 総階数（数値のみ）,
    "floor_unit": 所在階（数値のみ）,
    "delivery_timing": "引渡し時期（例: 即時・2025年3月）",
    "reins_number": "レインズ番号",
    "bcr": 建ぺい率（%・数値のみ）,
    "far": 容積率（%・数値のみ）,
    "management_fee": 管理費（円/月・数値のみ）,
    "repair_reserve": 修繕積立金（円/月・数値のみ）,
    "total_units": 総戸数（数値のみ）,
    "city_plan": "都市計画（例: 市街化区域）",
    "use_zone": "用途地域（例: 第一種低層住居専用地域）",
    "private_road": false,
    "features": ["特徴1", "特徴2"]
  },
  "confidence": {
    "price": "high|medium|low",
    "station_walk": "high|medium|low",
    ... 抽出した全フィールド分
  },
  "raw_text": "資料から読み取ったテキスト全文"
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
