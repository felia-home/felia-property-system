import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        content: body.content,
      },
    });

    // Update last_contacted_at on customer
    await prisma.customer.update({
      where: { id: params.id },
      data: { last_contacted_at: new Date() },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers/[id]/activities error:", error);
    return NextResponse.json({ error: "活動記録の登録に失敗しました" }, { status: 500 });
  }
}
