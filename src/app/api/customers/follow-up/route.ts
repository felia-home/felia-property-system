import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  detectCustomersNeedingFollowUp,
  generateFollowUpMessage,
} from "@/agents/follow-up-agent";

// GET /api/customers/follow-up
// 追客が必要な顧客一覧を返す
export async function GET() {
  try {
    const customerIds = await detectCustomersNeedingFollowUp();
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        name: true,
        desired_areas: true,
        desired_budget_max: true,
        last_contact_at: true,
        status: true,
        ai_score: true,
        assigned_to: true,
        assigned_staff: { select: { name: true } },
      },
      orderBy: { ai_score: "desc" },
    });
    return NextResponse.json({ customers, count: customers.length });
  } catch (error) {
    console.error("GET /api/customers/follow-up error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/customers/follow-up
// body: { mode: "preview" | "execute", customer_ids?: string[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      mode: "preview" | "execute";
      customer_ids?: string[];
      // override messages keyed by customer_id (for edited messages)
      overrides?: Record<string, { subject: string; body: string }>;
    };

    const { mode, customer_ids, overrides = {} } = body;
    const ids = customer_ids ?? (await detectCustomersNeedingFollowUp());

    const results = [];
    for (const id of ids) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const result = await generateFollowUpMessage(id);

      // Apply user edits if provided
      if (overrides[id]) {
        result.subject = overrides[id].subject;
        result.body = overrides[id].body;
      }

      results.push(result);

      if (mode === "execute" && result.action === "EMAIL") {
        const content = `【AI自動追客】\n件名: ${result.subject}\n\n${result.body}`;
        const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        await prisma.customerActivity.create({
          data: {
            customer_id: id,
            type: "AI_AUTO",
            direction: "OUTBOUND",
            content,
            next_action: "送信確認・返信待ち",
            next_action_at: threeDays,
          },
        });

        await prisma.customer.update({
          where: { id },
          data: {
            last_contact_at: new Date(),
            next_contact_at: threeDays,
            ai_next_action: result.reason,
            status: "CONTACTING",
          },
        });
      }
    }

    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error("POST /api/customers/follow-up error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
