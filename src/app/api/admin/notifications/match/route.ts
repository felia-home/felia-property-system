import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPropertyWhere(conditions: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const and: any[] = [
    { is_deleted: false },
    { published_hp: true },
  ];

  if (conditions.property_type) {
    and.push({ property_type: conditions.property_type });
  }
  if (conditions.city) {
    and.push({ city: { contains: conditions.city } });
  }
  if (conditions.price_min != null || conditions.price_max != null) {
    and.push({
      price: {
        ...(conditions.price_min != null ? { gte: Number(conditions.price_min) } : {}),
        ...(conditions.price_max != null ? { lte: Number(conditions.price_max) } : {}),
      },
    });
  }
  if (conditions.rooms) {
    and.push({ rooms: { contains: conditions.rooms } });
  }
  if (conditions.station) {
    and.push({
      OR: [
        { station_name1: { contains: conditions.station } },
        { station_name2: { contains: conditions.station } },
        { station_name3: { contains: conditions.station } },
      ],
    });
  }
  if (conditions.area_m2_min != null) {
    and.push({ area_build_m2: { gte: Number(conditions.area_m2_min) } });
  }
  if (conditions.area_m2_max != null) {
    and.push({ area_build_m2: { lte: Number(conditions.area_m2_max) } });
  }

  return { AND: and };
}

/**
 * POST /api/admin/notifications/match
 * Body: { member_id?: string }
 * 全会員（または指定会員）の検索条件と公開物件をマッチングしてプレビューを返す
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const memberId = body.member_id as string | undefined;

    // 対象会員の検索条件を取得（notify_email = true のみ）
    const searchConditions = await prisma.memberSearchCondition.findMany({
      where: {
        ...(memberId ? { member_id: memberId } : {}),
        notify_email: true,
      },
      include: {
        member: {
          select: { id: true, name: true, email: true, is_active: true },
        },
      },
    });

    // 会員ごとにマッチング
    const resultMap = new Map<
      string,
      { member: { id: string; name: string; email: string }; matched_count: number; property_ids: string[] }
    >();

    await Promise.all(
      searchConditions.map(async (sc) => {
        if (!sc.member.is_active) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conditions = sc.conditions as Record<string, any>;
        const where = buildPropertyWhere(conditions);

        const [count, props] = await Promise.all([
          prisma.property.count({ where }),
          prisma.property.findMany({
            where,
            select: { id: true },
            take: 20,
            orderBy: { created_at: "desc" },
          }),
        ]);

        if (count === 0) return;

        const existing = resultMap.get(sc.member_id);
        if (existing) {
          existing.matched_count = Math.max(existing.matched_count, count);
          for (const p of props) {
            if (!existing.property_ids.includes(p.id)) existing.property_ids.push(p.id);
          }
        } else {
          resultMap.set(sc.member_id, {
            member: sc.member,
            matched_count: count,
            property_ids: props.map((p) => p.id),
          });
        }
      })
    );

    const results = Array.from(resultMap.values()).sort(
      (a, b) => b.matched_count - a.matched_count
    );

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error("POST /api/admin/notifications/match error:", error);
    return NextResponse.json({ error: "マッチング処理に失敗しました" }, { status: 500 });
  }
}
