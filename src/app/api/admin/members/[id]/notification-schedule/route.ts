import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/members/[id]/notification-schedule
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [schedule, conditions, logs] = await Promise.all([
      prisma.memberNotificationSchedule.findUnique({
        where: { member_id: params.id },
      }),
      prisma.memberSearchCondition.findMany({
        where: { member_id: params.id },
        orderBy: { created_at: "desc" },
      }),
      prisma.memberNotificationLog.findMany({
        where: { member_id: params.id },
        orderBy: { sent_at: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ schedule, conditions, logs });
  } catch (error) {
    console.error("GET /api/admin/members/[id]/notification-schedule error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PUT /api/admin/members/[id]/notification-schedule
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { frequency, notify_day, notify_dow, is_active } = await req.json();

    const schedule = await prisma.memberNotificationSchedule.upsert({
      where: { member_id: params.id },
      create: {
        member_id: params.id,
        frequency: frequency ?? "weekly",
        notify_day: notify_day ?? 1,
        notify_dow: notify_dow ?? null,
        is_active: is_active ?? true,
      },
      update: {
        ...(frequency !== undefined && { frequency }),
        ...(notify_day !== undefined && { notify_day }),
        ...(notify_dow !== undefined && { notify_dow }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("PUT /api/admin/members/[id]/notification-schedule error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// POST /api/admin/members/[id]/notification-schedule/conditions
// This route handles search condition CRUD via query param action
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, condition_id, name, conditions, notify_email } = await req.json();

    if (action === "add") {
      if (!name || !conditions) {
        return NextResponse.json({ error: "name と conditions は必須です" }, { status: 400 });
      }
      const created = await prisma.memberSearchCondition.create({
        data: {
          member_id: params.id,
          name,
          conditions,
          notify_email: notify_email ?? false,
        },
      });
      return NextResponse.json({ condition: created }, { status: 201 });
    }

    if (action === "delete") {
      if (!condition_id) {
        return NextResponse.json({ error: "condition_id は必須です" }, { status: 400 });
      }
      await prisma.memberSearchCondition.delete({ where: { id: condition_id } });
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle_notify") {
      if (!condition_id) {
        return NextResponse.json({ error: "condition_id は必須です" }, { status: 400 });
      }
      const existing = await prisma.memberSearchCondition.findUnique({
        where: { id: condition_id },
      });
      if (!existing) return NextResponse.json({ error: "条件が見つかりません" }, { status: 404 });

      const updated = await prisma.memberSearchCondition.update({
        where: { id: condition_id },
        data: { notify_email: !existing.notify_email },
      });
      return NextResponse.json({ condition: updated });
    }

    return NextResponse.json({ error: "不明なアクションです" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/members/[id]/notification-schedule error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
