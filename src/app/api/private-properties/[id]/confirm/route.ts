import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.privateProperty.update({
      where: { id: params.id },
      data: { confirmed_at: new Date() },
      include: { agent: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ property });
  } catch (error) {
    console.error("POST /api/private-properties/[id]/confirm error:", error);
    return NextResponse.json({ error: "物件確認に失敗しました" }, { status: 500 });
  }
}
