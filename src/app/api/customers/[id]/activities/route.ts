import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/customers/[id]/activities
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activities = await prisma.customerActivity.findMany({
      where: { customer_id: params.id },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("GET /api/customers/[id]/activities error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/customers/[id]/activities
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.type || !body.content) {
      return NextResponse.json({ error: "種別と内容は必須です" }, { status: 400 });
    }

    const activity = await prisma.customerActivity.create({
      data: {
        customer_id: params.id,
        staff_id: body.staff_id ?? null,
        type: body.type,
        direction: body.direction ?? "OUTBOUND",
        content: body.content,
        property_id: body.property_id ?? null,
        result: body.result ?? null,
        next_action: body.next_action ?? null,
        next_action_at: body.next_action_at ? new Date(body.next_action_at) : null,
      },
    });

    await prisma.customer.update({
      where: { id: params.id },
      data: { last_contact_at: new Date() },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers/[id]/activities error:", error);
    return NextResponse.json({ error: "活動記録の登録に失敗しました" }, { status: 500 });
  }
}
