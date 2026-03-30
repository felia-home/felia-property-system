import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { successor_id, note, retirement_reason, retirement_date } = await request.json() as {
      successor_id?: string;
      note?: string;
      retirement_reason?: string;
      retirement_date?: string;
    };

    const properties = await prisma.property.findMany({
      where: { agent_id: params.id, is_deleted: false },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (successor_id && properties.length > 0) {
        await tx.property.updateMany({
          where: { agent_id: params.id, is_deleted: false },
          data: { agent_id: successor_id },
        });

        await tx.propertyTransfer.createMany({
          data: properties.map((p) => ({
            property_id: p.id,
            from_staff_id: params.id,
            to_staff_id: successor_id,
            reason: "retirement",
            note: note ?? null,
          })),
        });
      }

      await tx.staff.update({
        where: { id: params.id },
        data: {
          is_active: false,
          retirement_date: retirement_date ? new Date(retirement_date) : new Date(),
          retirement_reason: retirement_reason ?? note ?? null,
          successor_id: successor_id ?? null,
          published_hp: false,
        },
      });
    });

    return NextResponse.json({ transferred: properties.length });
  } catch (error) {
    console.error("POST /api/staff/[id]/retire error:", error);
    return NextResponse.json({ error: "退職処理に失敗しました" }, { status: 500 });
  }
}
