import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  const staffId    = searchParams.get("staff_id");
  const dateFrom   = searchParams.get("date_from");
  const dateTo     = searchParams.get("date_to");

  const visits = await prisma.visitAppointment.findMany({
    where: {
      ...(customerId ? { customer_id: customerId } : {}),
      ...(staffId    ? { staff_id: staffId }       : {}),
      ...(dateFrom || dateTo ? {
        scheduled_at: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
        },
      } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, tel: true } },
      property: { select: { id: true, building_name: true, city: true, town: true, price: true } },
      staff:    { select: { id: true, name: true } },
    },
    orderBy: { scheduled_at: "desc" },
  });

  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    customer_id:     string;
    property_id?:    string | null;
    staff_id?:       string | null;
    scheduled_at:    string;
    status?:         string;
    result?:         string | null;
    feedback?:       string | null;
    next_action?:    string | null;
    next_action_at?: string | null;
  };

  if (!body.customer_id || !body.scheduled_at) {
    return NextResponse.json({ error: "customer_id and scheduled_at required" }, { status: 400 });
  }

  const visit = await prisma.visitAppointment.create({
    data: {
      customer_id:    body.customer_id,
      property_id:    body.property_id ?? null,
      staff_id:       body.staff_id ?? null,
      scheduled_at:   new Date(body.scheduled_at),
      status:         body.status ?? "SCHEDULED",
      result:         body.result ?? null,
      feedback:       body.feedback ?? null,
      next_action:    body.next_action ?? null,
      next_action_at: body.next_action_at ? new Date(body.next_action_at) : null,
    },
    include: {
      customer: { select: { id: true, name: true } },
      property: { select: { id: true, building_name: true, city: true } },
      staff:    { select: { id: true, name: true } },
    },
  });

  // 顧客のステータスを VISITING に更新
  await prisma.customer.update({
    where: { id: body.customer_id },
    data:  { status: "VISITING", last_contact_at: new Date() },
  });

  return NextResponse.json({ visit }, { status: 201 });
}
