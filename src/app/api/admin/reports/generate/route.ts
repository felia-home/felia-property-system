import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// POST /api/admin/reports/generate
// body: { type: 'WEEKLY' | 'MONTHLY', year?, month?, store_id? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, year, month, store_id } = await req.json() as {
    type: "WEEKLY" | "MONTHLY";
    year?: number;
    month?: number;
    store_id?: string | null;
  };

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (type === "MONTHLY") {
    // 引数があれば対象月、なければ前月
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth(); // 0-indexed → 前月の月番号
    periodStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    periodEnd   = new Date(y, m, 0, 23, 59, 59, 999);
  } else {
    // 前週（月〜日）
    const dayOfWeek = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - dayOfWeek - 6);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    periodStart = lastMonday;
    periodEnd   = lastSunday;
  }

  const where = {
    created_at: { gte: periodStart, lte: periodEnd },
    ...(store_id ? { store_id } : {}),
  };

  const totalInquiries = await prisma.inquiry.count({ where });

  const bySource = await prisma.inquiry.groupBy({
    by: ["source"],
    where,
    _count: { id: true },
  });

  const activities = await prisma.customerActivity.groupBy({
    by: ["staff_id", "type"],
    where: { created_at: { gte: periodStart, lte: periodEnd } },
    _count: { id: true },
  });

  const overdueCustomers = await prisma.customer.count({
    where: {
      is_deleted: false,
      next_contact_at: { lt: periodStart },
      status: { notIn: ["CLOSED", "LOST"] },
    },
  });

  const pipeline = await prisma.customer.groupBy({
    by: ["status"],
    where: { is_deleted: false },
    _count: { id: true },
  });

  // スタッフ別集計
  const staffIds = [...new Set(activities.map(a => a.staff_id).filter(Boolean))] as string[];
  const staffs = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true },
  });
  const staffMap = Object.fromEntries(staffs.map(s => [s.id, s.name]));

  const staffStats: Record<string, Record<string, number>> = {};
  for (const act of activities) {
    const key = staffMap[act.staff_id ?? ""] ?? "未割当";
    if (!staffStats[key]) staffStats[key] = {};
    staffStats[key][act.type] = (staffStats[key][act.type] ?? 0) + act._count.id;
  }

  const dataJson = {
    period:      { start: periodStart, end: periodEnd, type },
    inquiries:   {
      total:    totalInquiries,
      bySource: bySource.map(s => ({ source: s.source ?? "OTHER", count: s._count.id })),
    },
    activities:  staffStats,
    pipeline:    pipeline.map(p => ({ status: p.status, count: p._count.id })),
    overdue:     overdueCustomers,
    generatedAt: new Date(),
  };

  const report = await prisma.scheduledReport.create({
    data: {
      type,
      period_start: periodStart,
      period_end:   periodEnd,
      store_id:     store_id ?? null,
      data_json:    dataJson,
    },
  });

  return NextResponse.json({ ok: true, report_id: report.id, data: dataJson });
}
