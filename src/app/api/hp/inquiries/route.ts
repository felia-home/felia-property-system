import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/hp/inquiries
// HPフロント側から送信されるお問い合わせを受け付ける
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      propertyId?: string;
      propertyNo?: string;
      inquiryType?: string;
      message?: string;
      token?: string;
    };

    const {
      name,
      email,
      phone,
      propertyId,
      propertyNo,
      inquiryType = "GENERAL",
      message,
      token,
    } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "名前・メールアドレス・メッセージは必須です" },
        { status: 400 }
      );
    }

    // トークン経由の場合、顧客IDを解決（既存顧客と紐づける）
    let customerId: string | null = null;
    if (token) {
      const tokenRecord = await prisma.privateSelectionToken.findUnique({
        where: { token },
      });
      if (tokenRecord && tokenRecord.expires_at > new Date()) {
        customerId = tokenRecord.customer_id;
      }
    }

    // inquiries テーブルに保存
    // Inquiry モデルのフィールド: customer_name / customer_email / customer_tel /
    //   source / received_at / inquiry_type / message / property_id / property_number /
    //   customer_id / token / status
    const inquiry = await prisma.inquiry.create({
      data: {
        source: "HP",
        received_at: new Date(),
        inquiry_type: inquiryType,
        message,
        customer_name: name,
        customer_email: email,
        customer_tel: phone ?? null,
        property_id: propertyId ?? null,
        property_number: propertyNo ?? null,
        customer_id: customerId,
        token: token ?? null,
        status: "NEW",
      },
    });

    // TODO: 顧客への自動返信メール（サービス確定後に実装）
    // to: email, subject: 【フェリアホーム】お問い合わせを受け付けました
    console.log("[DEBUG] 問い合わせ受付:", inquiry.id, name, email);

    // TODO: 管理者への通知メール（サービス確定後に実装）
    // to: process.env.ADMIN_NOTIFY_EMAIL

    return NextResponse.json({ success: true, inquiryId: inquiry.id });
  } catch (error) {
    console.error("問い合わせ保存エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
