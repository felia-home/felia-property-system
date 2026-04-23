import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/members — 全会員一覧（管理画面用、is_active フィルタなし）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const onlyInactive = searchParams.get("inactive") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [];

    if (onlyInactive) andConditions.push({ is_active: false });

    if (search) {
      andConditions.push({
        OR: [
          { name:  { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          name_kana: true,
          phone: true,
          prefecture: true,
          city: true,
          is_active: true,
          email_verified: true,
          last_login_at: true,
          created_at: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      members,
    });
  } catch (error) {
    console.error("GET /api/members error:", error);
    return NextResponse.json({ error: "会員一覧の取得に失敗しました" }, { status: 500 });
  }
}

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

    // customers テーブルへ自動連携（既存顧客がある場合は復元・更新）
    try {
      const existingCustomer = await prisma.customer.findFirst({
        where: { email: member.email },
      });

      if (existingCustomer) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            member_id:            member.id,
            source:               "HP_MEMBER",
            is_member:            true,
            member_registered_at: member.created_at,
            is_deleted:           false,
            deleted_at:           null,
          },
        });
      } else {
        await prisma.customer.create({
          data: {
            name:                  member.name,
            email:                 member.email,
            tel:                   member.phone ?? null,
            source:                "HP_MEMBER",
            status:                "NEW",
            is_member:             true,
            member_registered_at:  member.created_at,
            member_id:             member.id,
            desired_property_type: [],
            desired_areas:         [],
            desired_stations:      [],
            desired_rooms:         [],
            desired_features:      [],
            tags:                  [],
          },
        });
      }
    } catch (e) {
      // customer作成失敗はログのみ（会員登録は成功扱い）
      console.error("customer auto-create/update failed:", e);
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
