import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/staff/[id]/retire
 * Body: { successor_id: string; note?: string }
 * 1. 担当物件を successor_id に一括移管
 * 2. PropertyTransfer ログを記録
 * 3. Staff を is_retired=true にする
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { successor_id, note } = await request.json() as { successor_id: string; note?: string };
    if (!successor_id) {
      return NextResponse.json({ error: "引継ぎ先スタッフIDが必要です" }, { status: 400 });
    }

    // Get all active properties assigned to this staff member
    const properties = await prisma.property.findMany({
      where: { agent_id: params.id, is_deleted: false },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      // Bulk-update agent_id
      await tx.property.updateMany({
        where: { agent_id: params.id, is_deleted: false },
        data: { agent_id: successor_id },
      });

      // Create transfer log records
      if (properties.length > 0) {
        await tx.propertyTransfer.createMany({
          data: properties.map((p) => ({
            id: `${params.id}-${p.id}-${Date.now()}`,
            property_id: p.id,
            from_staff_id: params.id,
            to_staff_id: successor_id,
            reason: "retirement",
            note: note ?? null,
          })),
        });
      }

      // Mark staff as retired
      await tx.staff.update({
        where: { id: params.id },
        data: {
          is_retired: true,
          retired_at: new Date(),
          successor_id,
        },
      });
    });

    return NextResponse.json({ transferred: properties.length });
  } catch (error) {
    console.error("POST /api/staff/[id]/retire error:", error);
    return NextResponse.json({ error: "退職処理に失敗しました" }, { status: 500 });
  }
}
