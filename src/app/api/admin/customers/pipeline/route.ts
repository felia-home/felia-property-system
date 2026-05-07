import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/customers/pipeline?store_id=...
// パイプラインカード用に、顧客一覧 + ステージ別の補助統計を返す
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission     = session.user?.permission ?? "";
  const sessionStaffId = session.user?.staffId ?? "";
  const sessionStoreId = session.user?.storeId ?? "";

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("store_id");

  // ロール別アクセス制御
  const where: Record<string, unknown> = { is_deleted: false };
  if (permission === "AGENT" || permission === "SENIOR_AGENT") {
    where.assigned_to = sessionStaffId || "__none__";
  } else if (permission === "MANAGER" || permission === "SENIOR_MANAGER") {
    if (!storeId && sessionStoreId) where.store_id = sessionStoreId;
  }
  if (storeId) where.store_id = storeId;

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ priority: "desc" }, { created_at: "desc" }],
    take: 1000,
    select: {
      id: true, name: true, status: true, priority: true, ai_score: true,
      desired_budget_max: true, desired_areas: true,
      last_contact_at: true, next_contact_at: true,
      lost_reason: true, lost_at: true, lost_note: true,
      do_not_contact: true,
      assigned_staff: { select: { id: true, name: true } },
    },
  });

  const ids = customers.map(c => c.id);
  if (ids.length === 0) {
    return NextResponse.json({ customers: [] });
  }

  // 1) 各顧客の type 別アクティビティ件数
  const counts = await prisma.customerActivity.groupBy({
    by: ["customer_id", "type"],
    where: { customer_id: { in: ids } },
    _count: { _all: true },
  });

  // 2) 各顧客の最新の CALL/EMAIL/SHOWING 各1件（property_id付き）
  const recentActivities = await prisma.customerActivity.findMany({
    where: {
      customer_id: { in: ids },
      type: { in: ["CALL", "EMAIL", "SHOWING", "VISIT"] },
    },
    orderBy: { created_at: "desc" },
    select: {
      customer_id: true, type: true, direction: true,
      result: true, content: true, property_id: true, created_at: true,
    },
  });

  // 3) 最新の Inquiry（媒体・日時）— customer_id 紐付き分のみ
  const inquiries = await prisma.inquiry.findMany({
    where: { customer_id: { in: ids } },
    orderBy: { received_at: "desc" },
    select: {
      customer_id: true, source: true, received_at: true,
    },
  });

  // 4) SHOWING activity の property_id 集合 → 物件名を一括解決
  const showingPropIds = [
    ...new Set(
      recentActivities
        .filter(a => a.type === "SHOWING" && a.property_id)
        .map(a => a.property_id as string)
    ),
  ];
  const properties = showingPropIds.length > 0
    ? await prisma.property.findMany({
        where: { id: { in: showingPropIds } },
        select: { id: true, building_name: true, city: true, town: true },
      })
    : [];
  const propMap = new Map(properties.map(p => [p.id, p]));

  // ── 集計 ─────────────────────────────────────────────────────────
  type Stats = {
    contact_attempts:   number; // CALL + EMAIL の件数
    call_count:         number;
    email_count:        number;
    showing_count:      number;
    last_call_at:       Date | null;
    last_email_at:      Date | null;
    last_email_result:  string | null; // 開封済 / 返信あり 等
    last_email_dir:     string | null;
    last_showing_at:    Date | null;
    last_showing_prop:  string | null;
    last_inquiry_src:   string | null;
    last_inquiry_at:    Date | null;
  };
  const statsByCustomer = new Map<string, Stats>();
  const blank = (): Stats => ({
    contact_attempts: 0, call_count: 0, email_count: 0, showing_count: 0,
    last_call_at: null, last_email_at: null,
    last_email_result: null, last_email_dir: null,
    last_showing_at: null, last_showing_prop: null,
    last_inquiry_src: null, last_inquiry_at: null,
  });

  for (const c of counts) {
    const s = statsByCustomer.get(c.customer_id) ?? blank();
    if (c.type === "CALL")    { s.call_count    += c._count._all; s.contact_attempts += c._count._all; }
    if (c.type === "EMAIL")   { s.email_count   += c._count._all; s.contact_attempts += c._count._all; }
    if (c.type === "SHOWING") { s.showing_count += c._count._all; }
    statsByCustomer.set(c.customer_id, s);
  }

  // recentActivities は created_at 降順なので、最初に出会ったものが最新
  for (const a of recentActivities) {
    const s = statsByCustomer.get(a.customer_id) ?? blank();
    if (a.type === "CALL"  && !s.last_call_at)   { s.last_call_at  = a.created_at; }
    if (a.type === "EMAIL" && !s.last_email_at)  {
      s.last_email_at = a.created_at;
      s.last_email_result = a.result ?? null;
      s.last_email_dir = a.direction ?? null;
    }
    if (a.type === "SHOWING" && !s.last_showing_at) {
      s.last_showing_at = a.created_at;
      if (a.property_id) {
        const p = propMap.get(a.property_id);
        if (p) {
          s.last_showing_prop = p.building_name || `${p.city ?? ""}${p.town ?? ""}` || null;
        }
      }
    }
    statsByCustomer.set(a.customer_id, s);
  }

  for (const i of inquiries) {
    if (!i.customer_id) continue;
    const s = statsByCustomer.get(i.customer_id) ?? blank();
    if (!s.last_inquiry_src) {
      s.last_inquiry_src = i.source;
      s.last_inquiry_at  = i.received_at;
    }
    statsByCustomer.set(i.customer_id, s);
  }

  const enriched = customers.map(c => ({
    ...c,
    stats: statsByCustomer.get(c.id) ?? blank(),
  }));

  return NextResponse.json({ customers: enriched });
}
