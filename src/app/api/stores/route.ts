import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get("company_id");
    const stores = await prisma.store.findMany({
      where: { ...(company_id ? { company_id } : {}), is_active: true },
      include: {
        _count: { select: { staff: { where: { is_retired: false } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = await prisma.store.create({
      data: {
        company_id: body.company_id,
        name: body.name,
        store_code: body.store_code.toUpperCase(),
        postal_code: body.postal_code ?? null,
        address: body.address ?? null,
        phone: body.phone ?? null,
      },
    });
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stores error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
