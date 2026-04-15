import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/members/register
// HP側からの会員登録エンドポイント（POST /api/members と同等）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      email?: string;
      password?: string;
      name?: string;
      name_kana?: string;
      phone?: string;
    };
    const { email, password, name, name_kana, phone } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "メールアドレス・パスワード・お名前は必須です" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
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

    // customers テーブルへ自動連携
    try {
      await prisma.customer.create({
        data: {
          name: member.name,
          email: member.email,
          tel: member.phone ?? null,
          source: "HP_MEMBER",
          status: "NEW",
          member_id: member.id,
          is_member: true,
          member_registered_at: new Date(),
        },
      });
    } catch (e) {
      console.error("customer auto-create failed:", e);
    }

    return NextResponse.json({
      success: true,
      member: { id: member.id, email: member.email, name: member.name },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
