import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/reports/kpi?year=&month=&store_id=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year    = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  const month   = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const storeId = searchParams.get("store_id") ?? undefined;

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate   = new Date(year, month, 0, 23, 59, 59, 999);
  const prevStart = new Date(year, month - 2, 1, 0, 0, 0, 0);
  const prevEnd   = new Date(year, month - 1, 0, 23, 59, 59, 999);

  const baseWhere = storeId ? { store_id: storeId } : {};

  const [thisMonthInquiries, prevMonthInquiries] = await Promise.all([
    prisma.inquiry.count({ where: { ...baseWhere, created_at: { gte: startDate, lte: endDate } } }),
    prisma.inquiry.count({ where: { ...baseWhere, created_at: { gte: prevStart, lte: prevEnd } } }),
  ]);

  // 営業職のみ（在籍中・ADMIN/BACKOFFICE 除外）
  const staffs = await prisma.staff.findMany({
    where: {
      is_active:  true,
      permission: { in: ["AGENT", "MANAGER", "SENIOR_MANAGER"] },
      ...(storeId ? { store_id: storeId } : {}),
    },
    select: { id: true, name: true },
  });

  const staffKpi = await Promise.all(staffs.map(async staff => {
    const [
      callCount, emailCount, visitCount,
      assignedInquiries, overdueCount,
    ] = await Promise.all([
      prisma.customerActivity.count({
        where: { staff_id: staff.id, type: "CALL", created_at: { gte: startDate, lte: endDate } },
      }),
      prisma.customerActivity.count({
        where: { staff_id: staff.id, type: "EMAIL", created_at: { gte: startDate, lte: endDate } },
      }),
      prisma.visitAppointment.count({
        where: { staff_id: staff.id, scheduled_at: { gte: startDate, lte: endDate } },
      }),
      prisma.inquiry.count({
        where: { assigned_to: staff.id, created_at: { gte: startDate, lte: endDate } },
      }),
      prisma.customer.count({
        where: {
          assigned_to: staff.id,
          is_deleted: false,
          next_contact_at: { lt: new Date() },
          status: { notIn: ["CLOSED", "LOST"] },
        },
      }),
    ]);

    return {
      staff_id: staff.id,
      name:     staff.name,
      calls:    callCount,
      emails:   emailCount,
      visits:   visitCount,
      assigned: assignedInquiries,
      overdue:  overdueCount,
      total:    callCount + emailCount + visitCount,
    };
  }));

  // 媒体別反響推移（月次）
  const monthlyBySource = await prisma.inquiry.groupBy({
    by: ["source"],
    where: { ...baseWhere, created_at: { gte: startDate, lte: endDate } },
    _count: { id: true },
  });

  // パイプライン転換率
  const customerWhere = storeId ? { store_id: storeId } : {};
  const [totalNewCustomers, contactedCount, visitingCount] = await Promise.all([
    prisma.customer.count({
      where: { ...customerWhere, created_at: { gte: startDate, lte: endDate } },
    }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        status: { notIn: ["NEW"] },
        created_at: { gte: startDate, lte: endDate },
      },
    }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        status: { in: ["VISITING", "NEGOTIATING", "CONTRACT", "CLOSED"] },
        created_at: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  return NextResponse.json({
    period: { year, month },
    inquiries: {
      thisMonth: thisMonthInquiries,
      prevMonth: prevMonthInquiries,
      diff:      thisMonthInquiries - prevMonthInquiries,
      bySource:  monthlyBySource.map(s => ({ source: s.source ?? "OTHER", count: s._count.id })),
    },
    conversion: {
      totalNew:   totalNewCustomers,
      contacted:  contactedCount,
      visiting:   visitingCount,
      contactRate: totalNewCustomers > 0 ? Math.round((contactedCount / totalNewCustomers) * 100) : 0,
      visitRate:   contactedCount > 0   ? Math.round((visitingCount  / contactedCount)   * 100) : 0,
    },
    staffKpi: staffKpi.sort((a, b) => b.total - a.total),
  });
}
