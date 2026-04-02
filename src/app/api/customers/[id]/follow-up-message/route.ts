import { NextRequest, NextResponse } from "next/server";
import { generateFollowUpMessage } from "@/agents/follow-up-agent";
import { prisma } from "@/lib/db";

// GET /api/customers/[id]/follow-up-message
// 1人の顧客の追客メッセージを生成して返す（実行はしない）
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await generateFollowUpMessage(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/customers/[id]/follow-up-message error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/customers/[id]/follow-up-message
// 生成済みメッセージを確定実行（CustomerActivityに記録）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as {
      subject: string;
      body: string;
      reason?: string;
    };

    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const content = `【AI自動追客】\n件名: ${body.subject}\n\n${body.body}`;

    await prisma.customerActivity.create({
      data: {
        customer_id: params.id,
        type: "AI_AUTO",
        direction: "OUTBOUND",
        content,
        next_action: "送信確認・返信待ち",
        next_action_at: threeDays,
      },
    });

    await prisma.customer.update({
      where: { id: params.id },
      data: {
        last_contact_at: new Date(),
        next_contact_at: threeDays,
        ai_next_action: body.reason ?? null,
        status: "CONTACTING",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/customers/[id]/follow-up-message error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
