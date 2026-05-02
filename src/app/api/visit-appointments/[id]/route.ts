import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<{
    status:         string;
    result:         string | null;
    feedback:       string | null;
    next_action:    string | null;
    next_action_at: string | null;
    scheduled_at:   string;
    staff_id:       string | null;
    property_id:    string | null;
  }>;

  const visit = await prisma.visitAppointment.update({
    where: { id: params.id },
    data: {
      ...(body.status      !== undefined ? { status:   body.status }   : {}),
      ...(body.result      !== undefined ? { result:   body.result }   : {}),
      ...(body.feedback    !== undefined ? { feedback: body.feedback } : {}),
      ...(body.next_action !== undefined ? { next_action: body.next_action } : {}),
      ...(body.next_action_at !== undefined
        ? { next_action_at: body.next_action_at ? new Date(body.next_action_at) : null }
        : {}),
      ...(body.scheduled_at ? { scheduled_at: new Date(body.scheduled_at) } : {}),
      ...(body.staff_id    !== undefined ? { staff_id:    body.staff_id }    : {}),
      ...(body.property_id !== undefined ? { property_id: body.property_id } : {}),
    },
  });

  return NextResponse.json({ visit });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.visitAppointment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
