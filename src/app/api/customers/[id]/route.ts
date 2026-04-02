import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UPDATABLE_FIELDS = [
  "name", "name_kana", "email", "phone",
  "budget_min", "budget_max",
  "area_preferences", "property_type_pref", "rooms_pref", "area_m2_pref",
  "status", "priority", "notes", "source", "assigned_agent_id",
  "last_contacted_at", "next_action_date", "next_action_note",
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
            inquiries: {
              orderBy: { received_at: "desc" },
              select: {
                id: true,
                source: true,
                received_at: true,
                ai_score: true,
                property_name: true,
                message: true,
                status: true,
                assigned_agent_id: true,
              },
            },
            activities: {
              orderBy: { created_at: "desc" },
              select: {
                id: true,
                type: true,
                content: true,
                staff_id: true,
                created_at: true,
              },
            },
          }
        : { contracts: true },
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
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/customers/[id] — 論理削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.update({
      where: { id: params.id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("DELETE /api/customers/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
