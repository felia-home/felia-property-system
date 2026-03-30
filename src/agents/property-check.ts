/**
 * PropertyCheckAgent
 * Claude Haiku を使って物件の実在確認・掲載継続チェックを行う
 *
 * 確認項目:
 * - 物件情報の基本的な整合性（価格・面積・築年など）
 * - 登録から日数が経過した物件の掲載継続判断
 * - ポータルでの成約・非掲載シグナルの検知サポート
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface PropertyCheckInput {
  id: string;
  property_type: string;
  price: number;
  city: string;
  town?: string | null;
  address?: string | null;
  station_name1?: string | null;
  station_walk1?: number | null;
  area_build_m2?: number | null;
  area_land_m2?: number | null;
  rooms?: string | null;
  building_year?: number | null;
  status: string;
  days_on_market?: number | null;
  inquiry_count?: number | null;
  published_at?: Date | null;
  ad_confirmed_at?: Date | null;
  reins_number?: string | null;
}

export interface PropertyCheckResult {
  status: "ok" | "warning" | "alert";
  score: number; // 0-100: 高いほど問題あり
  issues: Array<{
    field: string;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
  recommendation: string;
  checked_at: Date;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築一戸建て",
  USED_HOUSE: "中古一戸建て",
  MANSION: "中古マンション",
  NEW_MANSION: "新築マンション",
  LAND: "土地",
};

export async function runPropertyCheck(
  property: PropertyCheckInput
): Promise<PropertyCheckResult> {
  const daysOnMarket = property.days_on_market
    ?? (property.published_at
      ? Math.floor((Date.now() - new Date(property.published_at).getTime()) / 86_400_000)
      : null);

  const prompt = `あなたは不動産物件の掲載継続チェックを行うAIアシスタントです。
以下の物件情報を確認し、問題点・リスクを指摘してください。

【物件情報】
- 種別: ${PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type}
- 価格: ${property.price.toLocaleString()}万円
- 所在地: 東京都${property.city}${property.town ?? ""}${property.address ?? ""}
- 最寄駅: ${property.station_name1 ? `${property.station_name1} 徒歩${property.station_walk1}分` : "未登録"}
- 間取り: ${property.rooms ?? "未登録"}
- 建物面積: ${property.area_build_m2 ? `${property.area_build_m2}㎡` : "未登録"}
- 土地面積: ${property.area_land_m2 ? `${property.area_land_m2}㎡` : "未登録"}
- 築年: ${property.building_year ? `${property.building_year}年` : "未登録"}
- 現在ステータス: ${property.status}
- 掲載日数: ${daysOnMarket !== null ? `${daysOnMarket}日` : "未掲載"}
- 問い合わせ数: ${property.inquiry_count ?? 0}件
- 広告承諾: ${property.ad_confirmed_at ? "取得済み" : "未取得"}
- レインズ番号: ${property.reins_number ?? "未登録"}

以下の観点で確認してください:
1. 価格の妥当性（東京都内の相場から大きく外れていないか）
2. 情報の整合性（面積・価格・築年などの組み合わせが自然か）
3. 掲載継続の判断（日数・問い合わせ数から見た掲載状況）
4. 必須情報の欠落
5. 成約済みの可能性（日数・問い合わせゼロ等）

回答はJSON形式で返してください:
{
  "status": "ok" | "warning" | "alert",
  "score": 0-100の整数（高いほど問題あり）,
  "issues": [
    { "field": "フィールド名", "severity": "low"|"medium"|"high", "message": "問題の説明（日本語）" }
  ],
  "recommendation": "総合的な推奨アクション（日本語、1-2文）"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      status: "ok" | "warning" | "alert";
      score: number;
      issues: Array<{ field: string; severity: "low" | "medium" | "high"; message: string }>;
      recommendation: string;
    };

    return {
      status: parsed.status ?? "ok",
      score: Math.max(0, Math.min(100, parsed.score ?? 0)),
      issues: parsed.issues ?? [],
      recommendation: parsed.recommendation ?? "",
      checked_at: new Date(),
    };
  } catch (error) {
    console.error("PropertyCheckAgent error:", error);
    // Return safe fallback
    return {
      status: "warning",
      score: 50,
      issues: [
        {
          field: "system",
          severity: "low",
          message: "AIチェックでエラーが発生しました。手動で確認してください。",
        },
      ],
      recommendation: "システムエラーのため、手動で物件情報を確認してください。",
      checked_at: new Date(),
    };
  }
}
