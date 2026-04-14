import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, renderTemplate } from "@/lib/email";

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  GENERAL: "一般",
  PROPERTY: "物件について",
  ASSESSMENT: "査定",
  private_selection: "非公開物件",
  valuation: "査定",
  general: "一般",
};

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

    // メールテンプレート一括取得
    const [replyTemplate, notifyTemplate] = await Promise.all([
      prisma.emailTemplate.findUnique({ where: { template_key: "inquiry_auto_reply" } }),
      prisma.emailTemplate.findUnique({ where: { template_key: "inquiry_notify" } }),
    ]);

    // 顧客への自動返信
    if (replyTemplate) {
      try {
        const subject = renderTemplate(replyTemplate.subject, { customer_name: name });
        const html = renderTemplate(replyTemplate.body_html, {
          customer_name: name,
          message,
          staff_name: "フェリアホーム",
          staff_phone: process.env.CONTACT_PHONE ?? "",
        });
        await sendEmail({ to: email, subject, html });
      } catch (e) {
        console.error("[hp/inquiries] 自動返信メール送信エラー:", e);
      }
    }

    // 担当者への通知
    const notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
    if (notifyTemplate && notifyTo) {
      try {
        const subject = renderTemplate(notifyTemplate.subject, { customer_name: name });
        const html = renderTemplate(notifyTemplate.body_html, {
          customer_name: name,
          customer_email: email,
          customer_phone: phone ?? "未記入",
          inquiry_type: INQUIRY_TYPE_LABEL[inquiryType] ?? inquiryType,
          property_no: propertyNo ?? "未指定",
          message,
          via_token: token ? "マジックリンク経由" : "直接アクセス",
        });
        await sendEmail({ to: notifyTo, subject, html });
      } catch (e) {
        console.error("[hp/inquiries] 通知メール送信エラー:", e);
      }
    }

    return NextResponse.json({ success: true, inquiryId: inquiry.id });
  } catch (error) {
    console.error("問い合わせ保存エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
