import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const member = await prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        store: { select: { id: true, name: true, store_code: true } },
        _count: { select: { properties: { where: { is_deleted: false } } } },
      },
    });
    if (!member) return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
    return NextResponse.json({ staff: member });
  } catch (error) {
    console.error("GET /api/staff/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const UPDATABLE = ["name","name_kana","email","phone","role","license_number","store_id"] as const;
    const data: Record<string, unknown> = {};
    for (const k of UPDATABLE) {
      if (k in body) data[k] = body[k];
    }
    const member = await prisma.staff.update({ where: { id: params.id }, data });
    return NextResponse.json({ staff: member });
  } catch (error) {
    console.error("PATCH /api/staff/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
