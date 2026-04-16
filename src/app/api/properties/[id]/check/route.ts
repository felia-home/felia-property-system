import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/properties/[id]/check — 直近20件の確認ログを返す
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const logs = await prisma.propertyCheckLog.findMany({
      where: { property_id: params.id },
      orderBy: { checked_at: "desc" },
      take: 20,
      include: {
        staff: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/properties/[id]/check error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/properties/[id]/check — 手動確認ログを記録
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const body = await req.json() as {
      checked_by?: string;
      note?: string;
      new_price?: number | null;
    };

    // 物件の現在情報を取得
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        price: true,
        published_suumo: true,
        published_athome: true,
        published_yahoo: true,
        published_homes: true,
        published_hp: true,
      },
    });
    if (!property) return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });

    const now = new Date();

    // ポータル掲載中なら7日、HP公開のみなら14日
    const hasPortal =
      property.published_suumo ||
      property.published_athome ||
      property.published_yahoo ||
      property.published_homes;
    const intervalDays = hasPortal ? 7 : 14;

    // 価格変更がある場合のデータ
    const priceUpdate =
      body.new_price != null && body.new_price !== property.price
        ? { price: body.new_price }
        : {};

    // ログ記録 + 物件の last_checked_at / check_interval_days を更新
    const [log] = await prisma.$transaction([
      prisma.propertyCheckLog.create({
        data: {
          property_id: params.id,
          checked_by: body.checked_by ?? null,
          checked_at: now,
          old_price:
            body.new_price != null && body.new_price !== property.price
              ? property.price
              : null,
          new_price:
            body.new_price != null && body.new_price !== property.price
              ? body.new_price
              : null,
          note: body.note ?? null,
        },
        include: {
          staff: { select: { id: true, name: true } },
        },
      }),
      prisma.property.update({
        where: { id: params.id },
        data: {
          last_checked_at: now,
          check_interval_days: intervalDays,
          ...priceUpdate,
        },
      }),
    ]);

    return NextResponse.json({ log, check_interval_days: intervalDays });
  } catch (error) {
    console.error("POST /api/properties/[id]/check error:", error);
    return NextResponse.json({ error: "確認記録に失敗しました" }, { status: 500 });
  }
}
