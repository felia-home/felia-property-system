import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/private-selection/verify?token=<token>
// HPフロント側からトークンを検証するエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, reason: "no_token" });
    }

    const record = await prisma.privateSelectionToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    if (record.expires_at < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    // 初回アクセス時のみ used_at を記録
    if (!record.used_at) {
      await prisma.privateSelectionToken.update({
        where: { token },
        data: { used_at: new Date() },
      });
    }

    return NextResponse.json({
      valid: true,
      customerId: record.customer_id,
      email: record.email,
      expiresAt: record.expires_at.toISOString(),
    });
  } catch (error) {
    console.error("トークン検証エラー:", error);
    return NextResponse.json({ valid: false, reason: "server_error" });
  }
}
