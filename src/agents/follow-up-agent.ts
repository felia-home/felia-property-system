/**
 * FollowUpAgent
 * 担当者が追っていない顧客に対してAIが自動で追客メッセージを生成
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export interface FollowUpResult {
  customer_id: string;
  customer_name: string;
  action: "EMAIL" | "SKIP";
  subject?: string;
  body?: string;
  reason: string;
  suggested_properties?: string[];
}

// 追客が必要な顧客を検出
export async function detectCustomersNeedingFollowUp(): Promise<string[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const customers = await prisma.customer.findMany({
    where: {
      is_deleted: false,
      status: { in: ["NEW", "CONTACTING"] },
      do_not_contact: false,
      unsubscribed: false,
      OR: [
        { last_contact_at: null },
        { last_contact_at: { lt: sevenDaysAgo } },
      ],
    },
    select: { id: true },
  });

  return customers.map((c) => c.id);
}

// 顧客1人分の追客メッセージを生成
export async function generateFollowUpMessage(
  customerId: string
): Promise<FollowUpResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      family_members: true,
      activities: {
        orderBy: { created_at: "desc" },
        take: 5,
      },
    },
  });

  if (!customer) {
    return {
      customer_id: customerId,
      customer_name: "",
      action: "SKIP",
      reason: "顧客が見つかりません",
    };
  }

  // 顧客の希望条件に合う掲載中物件を検索
  const matchedProperties = await prisma.property.findMany({
    where: {
      published_hp: true,
      is_deleted: false,
      ...(customer.desired_areas && customer.desired_areas.length > 0
        ? { city: { in: customer.desired_areas } }
        : {}),
      ...(customer.desired_budget_max
        ? { price: { lte: customer.desired_budget_max } }
        : {}),
    },
    take: 3,
    orderBy: { published_at: "desc" },
    select: {
      id: true,
      city: true,
      town: true,
      rooms: true,
      price: true,
      station_name1: true,
      station_walk1: true,
      property_type: true,
    },
  });

  const daysSinceContact = customer.last_contact_at
    ? Math.floor(
        (Date.now() - new Date(customer.last_contact_at).getTime()) / 86400000
      )
    : null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `あなたはフェリアホームの優秀な不動産エージェントAIです。
以下の顧客に対して、物件内見のアポイントを取るためのメールを作成してください。

## 顧客情報
氏名: ${customer.name} 様
家族構成: ${customer.family_members.map((f) => `${f.relation}(${f.age != null ? f.age + "歳" : "年齢不明"})`).join("・") || "不明"}
希望エリア: ${customer.desired_areas?.join("・") || "未設定"}
希望予算: ${customer.desired_budget_max ? `${customer.desired_budget_max}万円以内` : "未設定"}
希望物件種別: ${customer.desired_property_type?.join("・") || "未設定"}
入居希望時期: ${customer.desired_move_timing || "未設定"}
最終連絡: ${daysSinceContact != null ? `${daysSinceContact}日前` : "連絡履歴なし"}
過去の対応: ${customer.activities.map((a) => a.content.slice(0, 50)).join(" / ") || "なし"}

## 条件に合う掲載中物件
${
  matchedProperties.length > 0
    ? matchedProperties
        .map(
          (p) =>
            `・${p.city}${p.town || ""} ${p.rooms || ""} ${p.price}万円${p.station_name1 ? `（${p.station_name1}駅 徒歩${p.station_walk1}分）` : ""} [ID:${p.id}]`
        )
        .join("\n")
    : "条件に合う掲載中物件が見つかりませんでした"
}

## メール作成ルール
- 件名と本文をそれぞれ作成
- 丁寧・親しみやすいトーン、押しつけがましくない
- 具体的な物件情報を1〜2件紹介（物件が見つからない場合は新着情報のご案内として作成）
- 内見のアポイントを促す
- 署名はフェリアホーム（担当者名は[担当者名]と記入）
- 不動産公正競争規約を遵守
- 本文300〜500文字

JSONのみ返答:
{
  "action": "EMAIL",
  "subject": "件名",
  "body": "本文（\\nで改行）",
  "reason": "この顧客に連絡すべき理由（30文字以内）",
  "suggested_property_ids": ["物件IDの配列"]
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const parsed = JSON.parse(
    text.replace(/```json\n?|\n?```/g, "").trim()
  ) as {
    action?: string;
    subject?: string;
    body?: string;
    reason?: string;
    suggested_property_ids?: string[];
  };

  return {
    customer_id: customerId,
    customer_name: customer.name,
    action: (parsed.action as "EMAIL" | "SKIP") ?? "EMAIL",
    subject: parsed.subject,
    body: parsed.body,
    reason: parsed.reason ?? "",
    suggested_properties: parsed.suggested_property_ids ?? [],
  };
}

// 全対象顧客の追客メッセージを一括生成
export async function runFollowUpBatch(): Promise<FollowUpResult[]> {
  const customerIds = await detectCustomersNeedingFollowUp();
  const results: FollowUpResult[] = [];

  for (const id of customerIds) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const result = await generateFollowUpMessage(id);
    results.push(result);
  }

  return results;
}
