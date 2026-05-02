import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      activities: {
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          type: true, content: true, result: true,
          created_at: true, direction: true,
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = new Anthropic();

  const prompt = `不動産営業の顧客情報と活動履歴を分析して、次のアクションを提案してください。

【顧客情報】
名前: ${customer.name}
ステータス: ${customer.status}
希望エリア: ${customer.desired_areas.join("・") || "未設定"}
希望予算: ${customer.desired_budget_min ?? "?"}〜${customer.desired_budget_max ?? "?"}万円
希望間取り: ${customer.desired_rooms.join("・") || "未設定"}
引越し時期: ${customer.desired_move_timing ?? "未設定"}
最終連絡: ${customer.last_contact_at ? new Date(customer.last_contact_at).toLocaleDateString("ja-JP") : "未連絡"}
次回予定: ${customer.next_contact_at ? new Date(customer.next_contact_at).toLocaleDateString("ja-JP") : "未設定"}
AIスコア: ${customer.ai_score ?? "未算出"}

【最近の活動履歴（直近10件）】
${customer.activities.map(a =>
    `${new Date(a.created_at).toLocaleDateString("ja-JP")} ${a.type} ${a.direction} - ${a.content.slice(0, 50)} ${a.result ? `[結果: ${a.result}]` : ""}`
  ).join("\n") || "（なし）"}

以下のJSON形式で返してください:
{
  "summary": "顧客の現状を2文で要約",
  "next_actions": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "具体的なアクション内容",
      "timing": "いつ行うか（例: 今日中、今週中、来週）",
      "reason": "この行動が必要な理由"
    }
  ],
  "contact_message": "次回連絡時の推奨メッセージ文（メール/LINE想定・200字以内）",
  "risk_level": "HIGH|MEDIUM|LOW",
  "risk_reason": "リスク評価の理由"
}

JSONのみ返してください。`;

  const response = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 1500,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  let suggestion: Record<string, unknown> = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) suggestion = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    suggestion = { summary: text, next_actions: [], contact_message: "", risk_level: "LOW" };
  }

  const summary = typeof suggestion.summary === "string" ? suggestion.summary : null;
  const nextActions = Array.isArray(suggestion.next_actions) ? suggestion.next_actions : [];
  const firstAction = nextActions[0] as { action?: string } | undefined;

  await prisma.customer.update({
    where: { id: params.id },
    data: {
      ai_analysis:    summary,
      ai_next_action: firstAction?.action ?? null,
      ai_analyzed_at: new Date(),
    },
  });

  return NextResponse.json({ suggestion });
}
