import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const commissions = await prisma.commissionMaster.findMany({
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json({ commissions });
  } catch (error) {
    console.error("GET /api/commissions error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { label } = await request.json() as { label?: string };
    if (!label?.trim()) {
      return NextResponse.json({ error: "ラベルは必須です" }, { status: 400 });
    }
    const maxOrder = await prisma.commissionMaster.aggregate({ _max: { sort_order: true } });
    const nextOrder = (maxOrder._max.sort_order ?? 0) + 1;
    const commission = await prisma.commissionMaster.create({
      data: { label: label.trim(), value: label.trim(), sort_order: nextOrder },
    });
    return NextResponse.json({ commission });
  } catch (error) {
    console.error("POST /api/commissions error:", error);
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
