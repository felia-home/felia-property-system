import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.reportSchedule.findMany({
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    type: string;
    is_active?: boolean;
    send_day?: number | null;
    send_hour?: number;
    recipients?: string[];
    store_ids?: string[];
  };

  const schedule = await prisma.reportSchedule.create({
    data: {
      type:       body.type,
      is_active:  body.is_active ?? true,
      send_day:   body.send_day ?? null,
      send_hour:  body.send_hour ?? 9,
      recipients: body.recipients ?? [],
      store_ids:  body.store_ids ?? [],
    },
  });
  return NextResponse.json({ schedule });
}
