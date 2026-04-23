import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMemberNotification } from "@/lib/mailer";

/**
 * POST /api/admin/notifications/send
 * Body: { member_id: string, property_ids: string[], subject?: string }
 * 指定会員に物件通知メールを送信し、ログを記録する
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { member_id, property_ids, subject } = (await req.json()) as {
      member_id: string;
      property_ids: string[];
      subject?: string;
    };

    if (!member_id || !property_ids?.length) {
      return NextResponse.json(
        { error: "member_id と property_ids は必須です" },
        { status: 400 }
      );
    }

    const [member, properties] = await Promise.all([
      prisma.member.findUnique({
        where: { id: member_id },
        select: { id: true, name: true, email: true, is_active: true },
      }),
      prisma.property.findMany({
        where: { id: { in: property_ids }, is_deleted: false },
        include: {
          images: {
            where: { is_main: true },
            select: { url: true },
            take: 1,
          },
        },
      }),
    ]);

    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }
    if (!member.is_active) {
      return NextResponse.json({ error: "退会済みの会員です" }, { status: 400 });
    }

    const mailSubject =
      subject || `【フェリアホーム】新着物件のお知らせ（${properties.length}件）`;

    await sendMemberNotification({
      to: member.email,
      memberName: member.name,
      subject: mailSubject,
      properties: properties.map((p) => ({
        id: p.id,
        title: p.title,
        catch_copy: p.catch_copy,
        price: p.price,
        city: p.city,
        town: p.town,
        rooms: p.rooms,
        area_build_m2: p.area_build_m2 as number | null,
        area_land_m2: p.area_land_m2 as number | null,
        station_name1: p.station_name1,
        station_walk1: p.station_walk1 as number | null,
        imageUrl: p.images[0]?.url ?? null,
      })),
    });

    // ログ記録
    await prisma.memberNotificationLog.create({
      data: {
        member_id,
        subject: mailSubject,
        matched_count: properties.length,
        status: "sent",
      },
    });

    // スケジュールの last_sent_at を更新（存在する場合）
    await prisma.memberNotificationSchedule.updateMany({
      where: { member_id },
      data: { last_sent_at: new Date() },
    });

    return NextResponse.json({ ok: true, sent_to: member.email, count: properties.length });
  } catch (error) {
    console.error("POST /api/admin/notifications/send error:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
