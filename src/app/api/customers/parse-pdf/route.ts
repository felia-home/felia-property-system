import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PARSE_PROMPT = `これはフェリアホームの顧客簿PDFです。
以下のJSONフォーマットで情報を抽出してください。
読み取れない項目はnullにしてください。
JSONのみ返答してください（前置き・説明・コードブロック不要）。

{
  "name": "氏名①（姓名）",
  "name_kana": "フリガナ①",
  "email": "メールアドレス①",
  "email2": "メールアドレス②",
  "tel": "TEL①（自宅・固定）",
  "tel_mobile": "TEL②（携帯）",
  "postal_code": "郵便番号（ハイフンなし7桁）",
  "prefecture": "都道府県",
  "city": "市区町村",
  "address": "番地以降",
  "current_housing_type": "現在のお住まい（持家/賃貸/社宅/実家 のいずれか）",
  "current_rent": "家賃（数値・万円単位、賃貸でない場合はnull）",
  "occupation": "職業",
  "annual_income": "年収①（数値・万円単位）",
  "source": "当社をお知りになったきっかけ（INTERNET/SIGNBOARD/EVENT/FLYER/REFERRAL/OTHER のいずれか）",
  "desired_property_type": ["希望物件種別の配列（NEW_HOUSE/USED_HOUSE/MANSION/LAND から該当するもの）"],
  "desired_areas": ["希望地域の配列（市区町村名など）"],
  "desired_budget_max": "予算上限（数値・万円単位）",
  "desired_move_timing": "購入予定時期（文字列）",
  "finance_type": "資金タイプ（CASH/LOAN/MIXED のいずれか）",
  "down_payment": "自己資金（数値・万円単位）",
  "has_property_to_sell": "売却物件あり（true/false）",
  "inquiry_note": "今回のご計画・ご購入理由など（文字列）",
  "internal_memo": "特記事項・備考",
  "family_members": [
    {
      "relation": "続柄（配偶者/子供/親/その他）",
      "name": "氏名",
      "name_kana": "フリガナ",
      "age": "年齢（数値）",
      "occupation": "職業",
      "annual_income": "年収（数値・万円単位）"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "PDFファイルが必要です" }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          } as Parameters<typeof client.messages.create>[0]["messages"][0]["content"][0],
          {
            type: "text",
            text: PARSE_PROMPT,
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: `解析に失敗しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
