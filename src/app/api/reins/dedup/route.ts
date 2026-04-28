import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: 重複件数の確認（ドライラン）
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 住所+価格で重複グループを検出
  const duplicates = await prisma.$queryRaw<{
    address: string;
    price: number;
    cnt: bigint;
  }[]>`
    SELECT address, price, COUNT(*) as cnt
    FROM reins_properties
    WHERE is_active = true
      AND address IS NOT NULL
      AND price IS NOT NULL
    GROUP BY address, price
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 100
  `;

  const totalDuplicates = duplicates.reduce(
    (sum, d) => sum + Number(d.cnt) - 1, 0
  );

  return NextResponse.json({
    duplicate_groups: duplicates.length,
    total_to_remove:  totalDuplicates,
    samples: duplicates.slice(0, 10).map(d => ({
      address: d.address,
      price:   Number(d.price),
      count:   Number(d.cnt),
    })),
  });
}

// POST: 重複を非アクティブ化（最古の1件を残す）
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 重複グループを取得
    const duplicates = await prisma.$queryRaw<{
      address: string;
      price: number;
    }[]>`
      SELECT address, price
      FROM reins_properties
      WHERE is_active = true
        AND address IS NOT NULL
        AND price IS NOT NULL
      GROUP BY address, price
      HAVING COUNT(*) > 1
    `;

    let deactivated = 0;

    for (const dup of duplicates) {
      // 同じ住所・価格の物件を取得（imported_at昇順＝最古が先頭）
      const items = await prisma.reinsProperty.findMany({
        where: {
          address:   dup.address,
          price:     Number(dup.price),
          is_active: true,
        },
        orderBy: { imported_at: "asc" },
        select: { id: true },
      });

      if (items.length <= 1) continue;

      // 最古の1件以外を非アクティブ化
      const toDeactivate = items.slice(1).map(i => i.id);
      await prisma.reinsProperty.updateMany({
        where: { id: { in: toDeactivate } },
        data:  { is_active: false },
      });
      deactivated += toDeactivate.length;
    }

    // アクティブ件数を確認
    const activeCount = await prisma.reinsProperty.count({
      where: { is_active: true },
    });

    return NextResponse.json({
      ok:           true,
      deactivated,
      active_count: activeCount,
    });
  } catch (error) {
    console.error("dedup error:", error);
    return NextResponse.json({ error: "重複処理に失敗しました" }, { status: 500 });
  }
}
