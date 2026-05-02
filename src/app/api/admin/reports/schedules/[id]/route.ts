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
    type:       string;
    is_active:  boolean;
    send_day:   number | null;
    send_hour:  number;
    recipients: string[];
    store_ids:  string[];
  }>;

  const schedule = await prisma.reportSchedule.update({
    where: { id: params.id },
    data:  body,
  });
  return NextResponse.json({ schedule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.reportSchedule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
