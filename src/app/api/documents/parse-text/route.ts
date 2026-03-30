import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const PROMPT = (text: string, source_url: string, source_type: string) => `
あなたは不動産物件情報の専門的な解析AIです。
以下のテキストは不動産ポータルサイト（${source_type || "不明"}）の
物件詳細ページからユーザーが手動でコピーしたテキストです。

## 情報源URL（参考）
${source_url || "不明"}

## コピーされたテキスト
${text}

---

このテキストから物件情報を抽出してJSONで返してください。

## 重要な抽出ルール

### 取引態様について
- テキストに記載の取引態様は「掲載会社（元付業者）の取引態様」です
- フェリアホームの取引態様は必ず「仲介」として our_transaction_type に設定
- 掲載会社名・電話番号・担当者は seller_company・seller_contact として抽出（内部管理）

### 売主情報（最重要・必ず抽出）
- 「取り扱い店舗」「問い合わせ先」「掲載会社」「会社名」などのセクションを探す
- 不動産会社名・支店名・電話番号・担当者名を全て抽出
- SUUMOの場合「取り扱い店舗情報」の会社名・電話番号を seller_company・seller_contact に

### 返却JSON形式（JSONのみ返答・前置き不要）
{
  "property_type": "USED_HOUSE",
  "price": 8280,
  "prefecture": "東京都",
  "city": "目黒区",
  "town": "平町2丁目",
  "address_detail": null,
  "station_line1": "東急東横線",
  "station_name1": "都立大学",
  "station_walk1": 8,
  "station_line2": null,
  "station_name2": null,
  "station_walk2": null,
  "area_land_m2": null,
  "area_build_m2": 90.64,
  "area_exclusive_m2": null,
  "rooms": "3LDK",
  "building_year": 2015,
  "building_month": 3,
  "structure": "木造",
  "floors_total": 2,
  "floor_unit": null,
  "direction": "南",
  "use_zone": "第一種低層住居専用地域",
  "bcr": 40,
  "far": 80,
  "management_fee": null,
  "repair_reserve": null,
  "delivery_timing": "相談",
  "current_status": "空家",
  "reins_number": null,
  "our_transaction_type": "仲介",
  "seller_company": "〇〇不動産 渋谷店",
  "seller_contact": "03-XXXX-XXXX",
  "seller_transaction_type": "専任媒介",
  "ad_transfer_ok": true,
  "equipment_list": ["システムキッチン", "床暖房", "追い焚き"],
  "source_url": "${source_url}",
  "source_type": "${source_type}",
  "extraction_confidence": 0.85,
  "confidence": {
    "price": "high",
    "seller_company": "high",
    "station_walk1": "high"
  },
  "needs_review_fields": ["reins_number"]
}

抽出できない項目は null にすること。JSONのみ返答。
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text: string; source_url?: string; source_type?: string };
    const { text, source_url = "", source_type = "不明" } = body;

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "テキストが短すぎます。物件ページのテキストを貼り付けてください" }, { status: 400 });
    }

    // Truncate to ~8000 chars to stay within token limits
    const truncated = text.slice(0, 8000);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: PROMPT(truncated, source_url, source_type) }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI解析結果のパースに失敗しました。テキストを確認してください" }, { status: 422 });
    }

    // Build confidence and needs_review for the UI
    const confidence = (extracted.confidence ?? {}) as Record<string, string>;
    const needsReview = (extracted.needs_review_fields ?? []) as string[];
    const lowConfidence: string[] = [];

    for (const [field, conf] of Object.entries(confidence)) {
      if (conf === "low") {
        if (!needsReview.includes(field)) needsReview.push(field);
        lowConfidence.push(field);
      }
    }

    return NextResponse.json({
      success: true,
      source_type: "text",
      source_url,
      extracted,
      confidence,
      needs_review: needsReview,
      low_confidence_fields: lowConfidence,
    });
  } catch (error) {
    console.error("POST /api/documents/parse-text error:", error);
    return NextResponse.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
