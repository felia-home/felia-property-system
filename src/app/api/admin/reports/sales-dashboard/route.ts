import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/reports/sales-dashboard?staff_id=&store_id=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staff_id");
  const storeId = searchParams.get("store_id");

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekStart  = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const customerWhere = {
    is_deleted: false,
    ...(staffId ? { assigned_to: staffId } : {}),
    ...(storeId ? { store_id: storeId } : {}),
  };

  const todayContacts = await prisma.customer.findMany({
    where: {
      ...customerWhere,
      next_contact_at: { gte: todayStart, lte: todayEnd },
    },
    select: {
      id: true, name: true, status: true, priority: true,
      next_contact_at: true, next_contact_note: true,
      last_contact_at: true, ai_score: true,
      assigned_staff: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { next_contact_at: "asc" }],
  });

  const overdueContacts = await prisma.customer.findMany({
    where: {
      ...customerWhere,
      next_contact_at: { lt: todayStart },
      status: { notIn: ["CLOSED", "LOST"] },
    },
    select: {
      id: true, name: true, status: true, priority: true,
      next_contact_at: true, last_contact_at: true, ai_score: true,
      assigned_staff: { select: { id: true, name: true } },
    },
    orderBy: { next_contact_at: "asc" },
  });

  const threeDaysAgo = new Date(todayStart);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const noContactCustomers = await prisma.customer.findMany({
    where: {
      ...customerWhere,
      status: { notIn: ["CLOSED", "LOST"] },
      OR: [
        { last_contact_at: { lt: threeDaysAgo } },
        { last_contact_at: null },
      ],
    },
    select: {
      id: true, name: true, status: true, priority: true,
      last_contact_at: true, ai_score: true,
      assigned_staff: { select: { id: true, name: true } },
    },
    orderBy: { last_contact_at: "asc" },
    take: 20,
  });

  const todayVisits = await prisma.visitAppointment.findMany({
    where: {
      scheduled_at: { gte: todayStart, lte: todayEnd },
      status: "SCHEDULED",
    },
    include: {
      customer: { select: { id: true, name: true } },
      property: { select: { id: true, building_name: true, city: true, town: true } },
      staff:    { select: { id: true, name: true } },
    },
    orderBy: { scheduled_at: "asc" },
  });

  const weeklyActivities = await prisma.customerActivity.groupBy({
    by: ["staff_id", "type"],
    where: { created_at: { gte: weekStart } },
    _count: { id: true },
  });

  const monthlyInquiries = await prisma.inquiry.count({
    where: {
      created_at: { gte: monthStart },
      ...(storeId ? { store_id: storeId } : {}),
    },
  });

  const pipeline = await prisma.customer.groupBy({
    by: ["status"],
    where: { is_deleted: false, ...(storeId ? { store_id: storeId } : {}) },
    _count: { id: true },
  });

  // 営業ダッシュボードには営業職のみ表示（ADMIN / BACKOFFICE / SENIOR_AGENT は除外）
  const staffList = await prisma.staff.findMany({
    where: {
      is_active: true,
      permission: { in: ["AGENT", "MANAGER", "SENIOR_MANAGER"] },
      ...(storeId ? { store_id: storeId } : {}),
    },
    select: { id: true, name: true },
  });
  const staffIds = staffList.map(s => s.id);

  const staffOverdue = await prisma.customer.groupBy({
    by: ["assigned_to"],
    where: {
      is_deleted: false,
      next_contact_at: { lt: todayStart },
      status: { notIn: ["CLOSED", "LOST"] },
      assigned_to: { in: staffIds },
    },
    _count: { id: true },
  });

  // フロントが `assigned` を参照するため alias 整形
  const reshape = <T extends { assigned_staff: { id: string; name: string } | null }>(c: T) => ({
    ...c,
    assigned: c.assigned_staff,
  });

  return NextResponse.json({
    today: {
      contacts: todayContacts.map(reshape),
      visits:   todayVisits,
      overdue:  overdueContacts.map(reshape),
    },
    alerts: {
      noContact:    noContactCustomers.map(reshape),
      overdueCount: overdueContacts.length,
      todayCount:   todayContacts.length,
      visitsCount:  todayVisits.length,
    },
    pipeline: pipeline.map(p => ({ status: p.status, count: p._count.id })),
    monthly:  { inquiries: monthlyInquiries },
    weekly:   { activities: weeklyActivities },
    staffList: staffList.map(s => ({
      ...s,
      overdueCount: staffOverdue.find(o => o.assigned_to === s.id)?._count.id ?? 0,
    })),
  });
}
