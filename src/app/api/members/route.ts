import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, name_kana, phone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const member = await prisma.member.create({
      data: {
        email,
        password_hash,
        name,
        name_kana: name_kana ?? null,
        phone: phone ?? null,
      },
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
