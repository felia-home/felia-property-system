import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { password } = await request.json() as { password?: string };

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上必要です" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.staff.update({
      where: { id: params.id },
      data: {
        password_hash: hash,
        is_locked: false,
        failed_login_count: 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/staff/[id]/set-password error:", error);
    return NextResponse.json({ error: "パスワード設定に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.staff.update({
      where: { id: params.id },
      data: { is_locked: false, failed_login_count: 0 },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/staff/[id]/set-password error:", error);
    return NextResponse.json({ error: "アンロックに失敗しました" }, { status: 500 });
  }
}
