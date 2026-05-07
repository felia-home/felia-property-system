import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...CORS_HEADERS, ...(init?.headers as Record<string, string> | undefined) } });
}

// POST /api/hp/views/property/[id]
// HP の物件詳細ページがマウント時に叩く計測ビーコン。
// 認証なし。エラーは握りつぶして {counted: false} を返す。
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    if (!propertyId) return json({ counted: false });

    // IPアドレス（プロキシ経由想定で x-forwarded-for を優先）
    const xff = req.headers.get("x-forwarded-for") ?? "";
    const ip = xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";

    const sessionKey = createHash("sha256")
      .update(`${ip}|${ua}`)
      .digest("hex")
      .slice(0, 16);

    // 同一(property_id, session_key)で過去1時間以内に既に記録されていればカウントしない
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.propertyView.findFirst({
      where: {
        property_id: propertyId,
        session_key: sessionKey,
        viewed_at:   { gte: oneHourAgo },
      },
      select: { id: true },
    });
    if (recent) {
      return json({ counted: false });
    }

    // 物件が存在しない場合は黙ってfalse（FKエラー回避）
    const exists = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });
    if (!exists) {
      return json({ counted: false });
    }

    await prisma.propertyView.create({
      data: {
        property_id: propertyId,
        session_key: sessionKey,
      },
    });

    return json({ counted: true });
  } catch (e) {
    console.error("[hp/views/property] error:", e instanceof Error ? e.message : e);
    return json({ counted: false });
  }
}

// CORS対応: HP（別ドメイン）から呼ばれるため OPTIONS を返す
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
