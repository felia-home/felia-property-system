import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ property });
  } catch (error) {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const property = await prisma.property.update({
      where: { id: params.id },
      data: { ...body, updated_at: new Date() },
    });
    return NextResponse.json({ property });
  } catch (error) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.property.update({
      where: { id: params.id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}