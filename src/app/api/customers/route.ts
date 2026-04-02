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
    const includeInquiries = searchParams.get("includeInquiries") === "true";

    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { name_kana: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [{ priority: "asc" }, { created_at: "desc" }],
      take: 200,
      include: includeInquiries
        ? {
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
          }
        : undefined,
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
        phone: body.phone ?? null,
        budget_min: body.budget_min ? Number(body.budget_min) : null,
        budget_max: body.budget_max ? Number(body.budget_max) : null,
        area_preferences: body.area_preferences ?? null,
        property_type_pref: body.property_type_pref ?? null,
        rooms_pref: body.rooms_pref ?? null,
        area_m2_pref: body.area_m2_pref ? Number(body.area_m2_pref) : null,
        status: body.status ?? "lead",
        notes: body.notes ?? null,
        source: body.source ?? null,
        assigned_agent_id: body.assigned_agent_id ?? null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ error: "顧客の登録に失敗しました" }, { status: 500 });
  }
}
