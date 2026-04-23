import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPDATABLE_FIELDS = [
  "name", "name_kana", "email", "tel", "tel_mobile", "line_id",
  "postal_code", "prefecture", "city", "address",
  "current_housing_type", "current_rent", "current_housing_note",
  "desired_property_type", "desired_areas", "desired_stations",
  "desired_budget_min", "desired_budget_max",
  "desired_area_min", "desired_area_max",
  "desired_rooms", "desired_floor_min", "desired_building_year",
  "desired_walk_max", "desired_move_timing", "desired_features", "desired_note",
  "finance_type", "down_payment", "annual_income",
  "loan_preapproval", "loan_amount", "loan_bank",
  "has_property_to_sell", "sell_property_note",
  "source", "source_detail", "first_inquiry_at", "first_inquiry_property",
  "status", "priority",
  "assigned_to", "assigned_at", "store_id",
  "last_contact_at", "next_contact_at", "next_contact_note",
  "contact_frequency", "do_not_contact", "unsubscribed",
  "internal_memo", "tags",
  "is_member", "member_registered_at",
];

// GET /api/customers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const includeRelations = searchParams.get("includeRelations") === "true";

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: includeRelations
        ? {
            contracts: true,
            member: { include: { profile: true } },
            family_members: { orderBy: { created_at: "asc" } },
            inquiries: {
              orderBy: { received_at: "desc" },
              select: {
                id: true,
                source: true,
                received_at: true,
                ai_score: true,
                ai_notes: true,
                property_name: true,
                property_number: true,
                message: true,
                status: true,
                priority: true,
                visit_hope: true,
                document_hope: true,
                assigned_to: true,
                assigned_staff: { select: { name: true } },
              },
            },
            activities: {
              orderBy: { created_at: "desc" },
              select: {
                id: true,
                type: true,
                direction: true,
                content: true,
                result: true,
                next_action: true,
                next_action_at: true,
                staff_id: true,
                created_at: true,
              },
            },
            assigned_staff: { select: { id: true, name: true } },
          }
        : {
            contracts: true,
            assigned_staff: { select: { id: true, name: true } },
          },
    });

    if (!customer || customer.is_deleted) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PATCH /api/customers/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in body) data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data,
      include: {
        assigned_staff: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/customers/[id] — 論理削除（管理者・マネージャー・オーナーのみ）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = (session?.user as { permission?: string })?.permission ?? "";
  if (!["ADMIN", "MANAGER", "OWNER"].includes(permission)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        contracts: {
          where: { status: { not: "CANCELLED" } },
          take: 1,
          select: { id: true },
        },
        member: { select: { id: true } },
      },
    });

    if (!customer || customer.is_deleted) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    if (customer.contracts.length > 0) {
      return NextResponse.json(
        { error: "有効な契約が存在するため削除できません" },
        { status: 400 }
      );
    }

    // HP会員の場合は紐づく Member も物理削除
    if (customer.source === "HP_MEMBER" && customer.member) {
      await prisma.member.delete({ where: { id: customer.member.id } });
    }

    await prisma.customer.update({
      where: { id: params.id },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    return NextResponse.json({
      ok: true,
      member_deleted: customer.source === "HP_MEMBER" && !!customer.member,
    });
  } catch (error) {
    console.error("DELETE /api/customers/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
