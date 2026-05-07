import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/reports/inquiry?store_id=&period=month&year=&month=&week=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const storeId    = searchParams.get("store_id") ?? undefined;
  const periodType = searchParams.get("period") ?? "month";
  const year       = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  const month      = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  let startDate: Date;
  let endDate: Date;
  if (periodType === "week") {
    const weekNum = parseInt(searchParams.get("week") ?? "1");
    startDate = new Date(year, month - 1, (weekNum - 1) * 7 + 1);
    endDate   = new Date(year, month - 1, weekNum * 7, 23, 59, 59);
  } else {
    startDate = new Date(year, month - 1, 1);
    endDate   = new Date(year, month, 0, 23, 59, 59);
  }

  const where = {
    created_at: { gte: startDate, lte: endDate },
    ...(storeId ? { store_id: storeId } : {}),
  };

  const total = await prisma.inquiry.count({ where });

  const bySource = await prisma.inquiry.groupBy({
    by: ["source"],
    where,
    _count: { id: true },
  });

  const byStore = await prisma.inquiry.groupBy({
    by: ["store_id"],
    where: { created_at: { gte: startDate, lte: endDate } },
    _count: { id: true },
  });

  const byType = await prisma.inquiry.groupBy({
    by: ["inquiry_type"],
    where,
    _count: { id: true },
  });

  const byProperty = await prisma.inquiry.groupBy({
    by: ["property_id", "property_name", "property_number"],
    where: { ...where, property_id: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const dailyInquiries = await prisma.inquiry.findMany({
    where,
    select: { created_at: true, source: true },
    orderBy: { created_at: "asc" },
  });
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const inq of dailyInquiries) {
    const day = inq.created_at.toISOString().slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = {};
    const src = inq.source ?? "OTHER";
    dailyMap[day][src] = (dailyMap[day][src] ?? 0) + 1;
  }

  const statusCounts = await prisma.inquiry.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  const byStaff = await prisma.inquiry.groupBy({
    by: ["assigned_to"],
    where,
    _count: { id: true },
  });
  const staffIds = byStaff.map(s => s.assigned_to).filter(Boolean) as string[];
  // 営業職のみ（在籍中・ADMIN/BACKOFFICE 除外）
  const staffs = await prisma.staff.findMany({
    where: {
      id:         { in: staffIds },
      is_active:  true,
      permission: { in: ["AGENT", "MANAGER", "SENIOR_MANAGER"] },
    },
    select: { id: true, name: true },
  });
  const staffMap = Object.fromEntries(staffs.map(s => [s.id, s.name]));

  const responseTimeData = await prisma.inquiry.aggregate({
    where: { ...where, response_time_min: { not: null } },
    _avg: { response_time_min: true },
  });

  return NextResponse.json({
    period: { start: startDate, end: endDate, type: periodType },
    total,
    bySource: bySource.map(s => ({
      source: s.source ?? "OTHER",
      count:  s._count.id,
    })),
    byStore: byStore.map(s => ({
      store_id: s.store_id ?? "未設定",
      count:    s._count.id,
    })),
    byType: byType.map(t => ({
      type:  t.inquiry_type ?? "OTHER",
      count: t._count.id,
    })),
    byProperty: byProperty.map(p => ({
      property_id:     p.property_id,
      property_name:   p.property_name,
      property_number: p.property_number,
      count:           p._count.id,
    })),
    daily: dailyMap,
    statusCounts: statusCounts.map(s => ({
      status: s.status,
      count:  s._count.id,
    })),
    byStaff: byStaff.map(s => ({
      staff_id: s.assigned_to,
      name:     staffMap[s.assigned_to ?? ""] ?? "未割当",
      count:    s._count.id,
    })),
    avgResponseTime: Math.round(responseTimeData._avg.response_time_min ?? 0),
  });
}
