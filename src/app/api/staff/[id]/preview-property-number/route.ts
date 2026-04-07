import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePropertyNumber } from "@/lib/staffCode";

// GET /api/staff/[id]/preview-property-number
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      select: { staff_code: true, name: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
    }

    if (!staff.staff_code) {
      return NextResponse.json(
        { error: "スタッフコードが設定されていません", name: staff.name },
        { status: 400 }
      );
    }

    const preview = await generatePropertyNumber(staff.staff_code);
    return NextResponse.json({ preview, staffCode: staff.staff_code, name: staff.name });
  } catch (error) {
    console.error("GET /api/staff/[id]/preview-property-number error:", error);
    return NextResponse.json({ error: "プレビュー生成に失敗しました" }, { status: 500 });
  }
}
