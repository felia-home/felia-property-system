import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const priority = searchParams.get("priority");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assigned_to");
    const includeInquiries = searchParams.get("includeInquiries") === "true";
    const includeFamily = searchParams.get("includeFamily") === "true";

    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (assignedTo) where.assigned_to = assignedTo;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { name_kana: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { tel: { contains: search } },
        { tel_mobile: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [
        { ai_score: "desc" },
        { created_at: "desc" },
      ],
      take: 200,
      include: {
        ...(includeInquiries ? {
          inquiries: {
            orderBy: { received_at: "desc" },
            take: 1,
            select: {
              id: true,
              source: true,
              received_at: true,
              ai_score: true,
              property_name: true,
            },
          },
        } : {}),
        ...(includeFamily ? {
          family_members: {
            orderBy: { created_at: "asc" },
            select: { id: true, relation: true, name: true, age: true },
          },
        } : {}),
        assigned_staff: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ customers, total: customers.length });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: "顧客一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "氏名は必須です" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        name_kana: body.name_kana ?? null,
        email: body.email ?? null,
        tel: body.tel ?? body.phone ?? null,
        tel_mobile: body.tel_mobile ?? null,
        line_id: body.line_id ?? null,
        postal_code: body.postal_code ?? null,
        prefecture: body.prefecture ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
        current_housing_type: body.current_housing_type ?? null,
        current_rent: body.current_rent ? Number(body.current_rent) : null,
        desired_budget_min: body.desired_budget_min ? Number(body.desired_budget_min) : null,
        desired_budget_max: body.desired_budget_max ? Number(body.desired_budget_max) : null,
        desired_property_type: body.desired_property_type ?? [],
        desired_areas: body.desired_areas ?? [],
        desired_stations: body.desired_stations ?? [],
        desired_rooms: body.desired_rooms ?? [],
        desired_features: body.desired_features ?? [],
        desired_move_timing: body.desired_move_timing ?? null,
        desired_note: body.desired_note ?? null,
        finance_type: body.finance_type ?? null,
        down_payment: body.down_payment ? Number(body.down_payment) : null,
        annual_income: body.annual_income ? Number(body.annual_income) : null,
        loan_preapproval: body.loan_preapproval ?? null,
        status: body.status ?? "NEW",
        priority: body.priority ?? "NORMAL",
        source: body.source ?? null,
        source_detail: body.source_detail ?? null,
        assigned_to: body.assigned_to ?? null,
        internal_memo: body.internal_memo ?? body.notes ?? null,
        tags: body.tags ?? [],
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ error: "顧客の登録に失敗しました" }, { status: 500 });
  }
}
