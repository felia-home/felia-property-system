import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export interface CustomerAIResult {
  score: number;
  priority: string;
  analysis: string;
  next_action: string;
}

export async function analyzeCustomer(customerId: string): Promise<CustomerAIResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      family_members: true,
      inquiries: { orderBy: { received_at: "desc" }, take: 5 },
      activities: { orderBy: { created_at: "desc" }, take: 10 },
    },
  });

  if (!customer) throw new Error("顧客が見つかりません");

  const client = new Anthropic();

  const prompt = `不動産仲介会社のAI追客システムです。
以下の顧客情報を分析して購入確度と次のアクションを提案してください。

顧客情報:
${JSON.stringify(
  {
    name: customer.name,
    status: customer.status,
    family: customer.family_members.map((f) => ({
      relation: f.relation,
      age: f.age,
      occupation: f.occupation,
      annual_income: f.annual_income,
    })),
    desired: {
      areas: customer.desired_areas,
      budget_min: customer.desired_budget_min,
      budget_max: customer.desired_budget_max,
      property_type: customer.desired_property_type,
      move_timing: customer.desired_move_timing,
    },
    finance: {
      type: customer.finance_type,
      loan_preapproval: customer.loan_preapproval,
      annual_income: customer.annual_income,
      down_payment: customer.down_payment,
    },
    source: customer.source,
    first_inquiry_at: customer.first_inquiry_at,
    last_contact_at: customer.last_contact_at,
    inquiries_count: customer.inquiries.length,
    recent_activities: customer.activities.slice(0, 5).map((a) => ({
      type: a.type,
      direction: a.direction,
      content: a.content.slice(0, 100),
      result: a.result,
      date: a.created_at,
    })),
  },
  null,
  2
)}

以下のJSONで返答してください:
{
  "score": 0-100の整数,
  "priority": "HIGH" | "NORMAL" | "LOW",
  "analysis": "購入確度の根拠と顧客の状況分析（100文字以内）",
  "next_action": "今すぐすべき具体的なアクション（50文字以内）"
}
JSONのみ返答。説明不要。`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const result = JSON.parse(
    text.replace(/```json\n?|\n?```/g, "").trim()
  ) as CustomerAIResult;

  // スコア・分析をDB保存
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ai_score: result.score,
      priority: result.priority,
      ai_analysis: result.analysis,
      ai_next_action: result.next_action,
      ai_analyzed_at: new Date(),
    },
  });

  return result;
}
