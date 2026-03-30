import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/property-number?store_id=xxx
 * Returns next property number preview: {store_code}-{YYMM}-{NNN}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const store_id = searchParams.get("store_id");
    if (!store_id) {
      return NextResponse.json({ error: "store_id が必要です" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { id: store_id } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${store.store_code}-${yy}${mm}-`;

    // Count existing property numbers with this prefix
    const count = await prisma.property.count({
      where: { property_number: { startsWith: prefix } },
    });

    const seq = String(count + 1).padStart(3, "0");
    const preview = `${prefix}${seq}`;

    return NextResponse.json({ preview, store_code: store.store_code });
  } catch (error) {
    console.error("GET /api/property-number error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
