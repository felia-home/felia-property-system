import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store_id = searchParams.get("store_id");
    const permission = searchParams.get("permission");
    const active = searchParams.get("active");
    const search = searchParams.get("search");
    const includeStats = searchParams.get("includeStats") === "true";

    const where: Record<string, unknown> = {};
    if (store_id) where.store_id = store_id;
    if (permission) where.permission = permission;
    if (active === "true") where.is_active = true;
    else if (active === "false") where.is_active = false;
    else where.is_active = true; // default: active only unless explicitly false
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { name_kana: { contains: search, mode: "insensitive" } },
        { employee_number: { contains: search, mode: "insensitive" } },
      ];
    }

    const staff = await prisma.staff.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, store_code: true } },
        ...(includeStats ? {
          _count: {
            select: {
              properties_as_agent: { where: { is_deleted: false } },
            },
          },
        } : {}),
      },
      orderBy: [{ store: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("GET /api/staff error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const member = await prisma.staff.create({
      data: {
        store_id: body.store_id as string ?? null,
        company_id: body.company_id as string ?? null,
        name: body.name as string,
        name_kana: body.name_kana as string ?? null,
        permission: body.permission as string ?? "AGENT",
        email_work: body.email_work as string ?? null,
        tel_work: body.tel_work as string ?? null,
        tel_mobile: body.tel_mobile as string ?? null,
        employment_type: body.employment_type as string ?? null,
        hire_date: body.hire_date ? new Date(body.hire_date as string) : null,
        position: body.position as string ?? null,
      },
    });
    return NextResponse.json({ staff: member }, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
