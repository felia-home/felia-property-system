import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { staffId, reason } = await request.json() as { staffId: string; reason?: string };

    const inquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        assigned_to: staffId,
        assigned_at: new Date(),
        assigned_by: "MANUAL",
        assignment_reason: reason ?? "手動で担当者を変更",
      },
      include: {
        assigned_staff: { select: { id: true, name: true } },
      },
    });

    await prisma.inquiryActivity.create({
      data: {
        inquiry_id: params.id,
        type: "STATUS_CHANGE",
        content: `担当者を ${inquiry.assigned_staff?.name ?? staffId} に変更しました`,
      },
    });

    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error("POST /api/inquiries/[id]/assign error:", error);
    return NextResponse.json({ error: "担当者変更に失敗しました" }, { status: 500 });
  }
}
