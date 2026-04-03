import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { member_id, property_ref, property_type, message, inquiry_type } = await req.json();

    const inquiry = await prisma.memberInquiry.create({
      data: {
        member_id,
        property_ref: property_ref ?? null,
        property_type: property_type ?? "PRIVATE",
        message: message ?? null,
        inquiry_type: inquiry_type ?? "DOCUMENT",
      },
    });

    // 管理システムの反響管理にも登録（失敗しても継続）
    const member = await prisma.member.findUnique({ where: { id: member_id } });
    if (member) {
      await prisma.inquiry.create({
        data: {
          source: "HP_MEMBER",
          customer_name: member.name,
          customer_email: member.email,
          customer_phone: member.phone ?? null,
          message: `【会員資料請求】物件番号: ${property_ref ?? "未公開物件"}\n${message ?? ""}`,
          status: "NEW",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, inquiry });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
