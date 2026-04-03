import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const member = await prisma.member.findUnique({ where: { email } });
    if (!member || !member.is_active) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { last_login_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      member: { id: member.id, email: member.email, name: member.name },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
