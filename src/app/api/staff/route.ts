import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store_id = searchParams.get("store_id");
    const include_retired = searchParams.get("include_retired") === "true";

    const staff = await prisma.staff.findMany({
      where: {
        ...(store_id ? { store_id } : {}),
        ...(!include_retired ? { is_retired: false } : {}),
      },
      include: {
        store: { select: { id: true, name: true, store_code: true } },
        _count: { select: { properties: { where: { is_deleted: false } } } },
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
    const body = await request.json();
    const member = await prisma.staff.create({
      data: {
        store_id: body.store_id,
        name: body.name,
        name_kana: body.name_kana ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        role: body.role ?? "agent",
        license_number: body.license_number ?? null,
      },
    });
    return NextResponse.json({ staff: member }, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
