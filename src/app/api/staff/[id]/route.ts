import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeProperties = searchParams.get("includeProperties") === "true";

    const member = await prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        store: { select: { id: true, name: true, store_code: true } },
        _count: {
          select: {
            properties_as_agent: { where: { is_deleted: false } },
          },
        },
        ...(includeProperties ? {
          properties_as_agent: {
            where: { is_deleted: false },
            select: {
              id: true,
              property_number: true,
              status: true,
              city: true,
              town: true,
              price: true,
              property_type: true,
              published_at: true,
              created_at: true,
            },
            orderBy: { created_at: "desc" as const },
            take: 50,
          },
        } : {}),
      },
    });

    if (!member) {
      return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ staff: member });
  } catch (error) {
    console.error("GET /api/staff/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as Record<string, unknown>;

    const UPDATABLE = [
      "name", "name_kana", "name_en", "nickname", "employee_number",
      "permission", "store_id", "company_id", "position",
      "email_work", "tel_work", "tel_mobile", "extension",
      "email_personal", "tel_personal",
      "postal_code", "prefecture", "city", "address",
      "birth_date", "gender", "blood_type",
      "emergency_contact", "emergency_tel", "emergency_relation",
      "employment_type", "hire_date", "trial_end_date", "department", "annual_salary",
      "monthly_target", "career_history",
      "photo_url", "bio", "catchphrase", "published_hp", "hp_order",
      "qualification", "favorite_word", "hobby", "memorable_client",
      "sub_image_url_1", "sub_image_url_2", "daily_mindset",
      "takken_number", "takken_prefecture", "takken_expires_at",
      "show_on_recruit", "joined_at", "motto", "favorite",
      "interview_q1", "interview_q2", "interview_q3",
      "interview_q4", "interview_q5", "interview_q6",
    ];

    const dateFields = ["birth_date", "hire_date", "trial_end_date", "takken_expires_at"];
    const data: Record<string, unknown> = {};

    for (const k of UPDATABLE) {
      if (!(k in body)) continue;
      const val = body[k];
      if (dateFields.includes(k)) {
        data[k] = val ? new Date(val as string) : null;
      } else {
        data[k] = val;
      }
    }

    // Array fields
    if ("qualifications" in body) data.qualifications = body.qualifications as string[];
    if ("specialty_areas" in body) data.specialty_areas = body.specialty_areas as string[];
    if ("specialty_types" in body) data.specialty_types = body.specialty_types as string[];

    const member = await prisma.staff.update({
      where: { id: params.id },
      data,
      include: {
        store: { select: { id: true, name: true, store_code: true } },
        _count: {
          select: {
            properties_as_agent: { where: { is_deleted: false } },
          },
        },
      },
    });
    return NextResponse.json({ staff: member });
  } catch (error) {
    console.error("PUT /api/staff/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

// DELETE /api/staff/[id]
// 論理削除（is_active=false + retirement_date=now）
// ADMIN / SENIOR_MANAGER のみ実行可能
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const permission = session.user?.permission as string | undefined;
    if (!["ADMIN", "SENIOR_MANAGER"].includes(permission ?? "")) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });
    }

    const existing = await prisma.staff.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
    }

    const propertyCount = await prisma.property.count({
      where: { agent_id: params.id, is_deleted: false },
    });
    if (propertyCount > 0) {
      return NextResponse.json(
        { error: `このスタッフには担当物件が${propertyCount}件あります。担当者を変更してから削除してください。` },
        { status: 400 }
      );
    }

    await prisma.staff.update({
      where: { id: params.id },
      data: {
        is_active: false,
        retirement_date: existing.retirement_date ?? new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/staff/[id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
