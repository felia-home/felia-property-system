import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/members/inquiries?member_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const member_id = searchParams.get("member_id");

  const where: Record<string, unknown> = {};
  if (member_id) where["member_id"] = member_id;

  const inquiries = await prisma.memberInquiry.findMany({
    where,
    orderBy: { created_at: "desc" },
    select: {
      id:            true,
      property_ref:  true,
      property_type: true,
      inquiry_type:  true,
      status:        true,
      created_at:    true,
    },
  });

  return NextResponse.json({ inquiries });
}

// POST /api/members/inquiries
export async function POST(req: NextRequest) {
  try {
    const { property_no, member_id, type, message } = await req.json();

    if (!property_no || !member_id) {
      return NextResponse.json(
        { error: "property_no と member_id は必須です" },
        { status: 400 }
      );
    }

    // 会員情報取得
    const member = await prisma.member.findUnique({
      where: { id: member_id },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    // 重複チェック（同一会員×同一物件）
    const existing = await prisma.memberInquiry.findFirst({
      where: {
        member_id,
        property_ref:  property_no,
        property_type: "PRIVATE",
      },
    });

    if (existing) {
      return NextResponse.json({
        success:          true,
        inquiry_id:       existing.id,
        already_requested: true,
      });
    }

    // 資料請求を記録
    const inquiry = await prisma.memberInquiry.create({
      data: {
        member_id,
        property_type: "PRIVATE",
        property_ref:  property_no,
        inquiry_type:  type ?? "DOCUMENT",
        message:       message ?? null,
        status:        "NEW",
      },
    });

    // 管理システムの反響管理にも登録（失敗しても継続）
    await prisma.inquiry.create({
      data: {
        source:          "HP_MEMBER",
        received_at:     new Date(),
        customer_name:   member.name,
        customer_email:  member.email,
        customer_tel:    member.phone ?? null,
        message:         `【会員資料請求】物件番号: ${property_no}\n${message ?? ""}`,
        status:          "NEW",
      },
    }).catch(() => {});

    // 社内通知メール
    try {
      const { sendMail } = await import("@/lib/mailer");
      const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

      await sendMail({
        to:      process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
        subject: `【資料請求】プライベートセレクション 物件番号: ${property_no}`,
        text: `プライベートセレクションの資料請求がありました。

■ 物件番号: ${property_no}
■ 会員名: ${member.name}
■ メール: ${member.email}
■ 電話: ${member.phone ?? "未登録"}
■ 日時: ${now}
■ 問合せID: ${inquiry.id}

管理画面から対応をお願いします。
https://admin.felia-home.co.jp/admin/inquiries`.trim(),
      });
    } catch (e) {
      console.error("社内通知メール送信失敗:", e);
    }

    // 会員への確認メール
    try {
      const { sendMail } = await import("@/lib/mailer");
      const receivedAt = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

      await sendMail({
        to:      member.email ?? "",
        subject: "【フェリアホーム】資料請求を受け付けました",
        text: `${member.name} 様

この度はフェリアホームへお問い合わせいただき、ありがとうございます。

以下の内容で資料請求を受け付けました。
担当者より折り返しご連絡いたします。

■ 物件番号: ${property_no}
■ 受付日時: ${receivedAt}

ご不明な点はお気軽にお問い合わせください。

---
株式会社フェリアホーム
TEL: 03-5981-8601
営業時間: 09:30〜19:00（火・水定休）`.trim(),
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#5BAD52;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:18px;">資料請求受付のご確認</h1>
  </div>
  <div style="padding:24px;">
    <p>${member.name} 様</p>
    <p>この度はフェリアホームへお問い合わせいただき、ありがとうございます。</p>
    <p>以下の内容で資料請求を受け付けました。<br>担当者より折り返しご連絡いたします。</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px;color:#6b7280;width:120px;">物件番号</td>
        <td style="padding:8px;font-weight:bold;">${property_no}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px;color:#6b7280;">受付日時</td>
        <td style="padding:8px;">${receivedAt}</td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:13px;">
      ご不明な点はお気軽にお問い合わせください。<br>
      TEL: 03-5981-8601（09:30〜19:00、火・水定休）
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280;">
    株式会社フェリアホーム｜渋谷区千駄ヶ谷4-16-7
  </div>
</div>`,
      });
    } catch (e) {
      console.error("確認メール送信失敗:", e);
    }

    return NextResponse.json({
      success:    true,
      inquiry_id: inquiry.id,
    });

  } catch (error) {
    console.error("member inquiry POST error:", error);
    return NextResponse.json({ error: "資料請求に失敗しました" }, { status: 500 });
  }
}
