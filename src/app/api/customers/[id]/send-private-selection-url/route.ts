import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail, renderTemplate } from "@/lib/email";
import { randomBytes } from "crypto";

// POST /api/customers/[id]/send-private-selection-url
// 新規トークンを発行し、顧客に非公開物件URLを送付する
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const customerId = params.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        assigned_staff: {
          select: { id: true, name: true, tel_work: true, tel_mobile: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }
    if (!customer.email) {
      return NextResponse.json(
        { error: "メールアドレスが登録されていません" },
        { status: 400 }
      );
    }

    // 既存の有効トークンを即時失効（再発行）
    await prisma.privateSelectionToken.updateMany({
      where: {
        customer_id: customerId,
        expires_at: { gt: new Date() },
        used_at: null,
      },
      data: { expires_at: new Date() },
    });

    // 新規トークン生成（32バイト = 64文字hex）
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30日後

    await prisma.privateSelectionToken.create({
      data: {
        token,
        customer_id: customerId,
        email: customer.email,
        expires_at: expiresAt,
      },
    });

    const hpBaseUrl = process.env.HP_BASE_URL ?? "https://index.felia-home.co.jp";
    const privateUrl = `${hpBaseUrl}/private-selection?token=${token}`;

    const staffName =
      customer.assigned_staff?.name ?? session.user?.name ?? "フェリアホーム担当";
    const staffPhone =
      customer.assigned_staff?.tel_mobile ??
      customer.assigned_staff?.tel_work ??
      "";

    // メールテンプレートから送信
    const template = await prisma.emailTemplate.findUnique({
      where: { template_key: "private_selection_url" },
    });

    if (template) {
      const expiresDateStr = expiresAt.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const subject = renderTemplate(template.subject, {
        customer_name: customer.name,
      });
      const html = renderTemplate(template.body_html, {
        customer_name: customer.name,
        staff_name: staffName,
        staff_phone: staffPhone,
        url: privateUrl,
        expires_date: expiresDateStr,
      });

      await sendEmail({ to: customer.email, subject, html });
    } else {
      // テンプレートが取得できない場合もログのみで続行
      console.warn("[send-private-selection-url] テンプレート未取得 - メール未送信");
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("トークン発行エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// GET /api/customers/[id]/send-private-selection-url
// 現在有効なトークンの有無と有効期限を返す
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const latest = await prisma.privateSelectionToken.findFirst({
      where: {
        customer_id: params.id,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!latest) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      expiresAt: latest.expires_at.toISOString(),
    });
  } catch (error) {
    console.error("トークン確認エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
