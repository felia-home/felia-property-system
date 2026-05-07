import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/customers/[id]/activities
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activities = await prisma.customerActivity.findMany({
      where: { customer_id: params.id },
      orderBy: { created_at: "desc" },
    });

    // staff情報を補完（リレーションが未定義のため手動JOIN）
    const staffIds = [...new Set(activities.map(a => a.staff_id).filter(Boolean))] as string[];
    const staffs = staffIds.length > 0
      ? await prisma.staff.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true },
        })
      : [];
    const staffMap = Object.fromEntries(staffs.map(s => [s.id, s]));

    return NextResponse.json({
      activities: activities.map(a => ({
        ...a,
        staff: a.staff_id ? staffMap[a.staff_id] ?? null : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/customers/[id]/activities error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/customers/[id]/activities
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const sessionStaffId = session?.user?.staffId ?? null;

    const body = await request.json() as {
      type:           string;
      phase?:         string;
      direction?:     string;
      content?:       string;
      result?:        string | null;
      next_action?:   string | null;
      next_action_at?: string | null;
      duration_min?:  number | null;
      property_id?:   string | null;
      proposal_ids?:  string[];
      staff_id?:      string;
    };

    if (!body.type) {
      return NextResponse.json({ error: "種別は必須です" }, { status: 400 });
    }

    const activity = await prisma.customerActivity.create({
      data: {
        customer_id:    params.id,
        staff_id:       body.staff_id ?? sessionStaffId,
        type:           body.type,
        phase:          body.phase ?? "SALES",
        direction:      body.direction ?? "OUTBOUND",
        content:        body.content ?? "",
        result:         body.result ?? null,
        next_action:    body.next_action ?? null,
        next_action_at: body.next_action_at ? new Date(body.next_action_at) : null,
        duration_min:   body.duration_min ?? null,
        property_id:    body.property_id ?? null,
        proposal_ids:   body.proposal_ids ?? [],
      },
    });

    // 顧客側の最終連絡日・次回連絡予定・ステータスを連動更新
    const updateData: Record<string, unknown> = {
      last_contact_at: new Date(),
    };
    if (body.next_action_at) {
      updateData.next_contact_at   = new Date(body.next_action_at);
      updateData.next_contact_note = body.next_action ?? null;
    }
    // ステータス自動遷移
    if (body.type === "SHOWING")                                 updateData.status = "VISITING";
    else if (body.type === "VISIT" && (body.phase ?? "SALES") === "SALES") updateData.status = "CONTACTING";
    else if (body.type === "CONTRACT")                           updateData.status = "CONTRACT";

    await prisma.customer.update({
      where: { id: params.id },
      data:  updateData,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers/[id]/activities error:", error);
    return NextResponse.json({ error: "活動記録の登録に失敗しました" }, { status: 500 });
  }
}
