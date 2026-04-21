import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/properties/[id]/documents
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const documents = await prisma.propertyDocument.findMany({
      where: { property_id: params.id },
      orderBy: [{ sort_order: "asc" }, { uploaded_at: "desc" }],
    });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("GET /api/properties/[id]/documents error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/properties/[id]/documents
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, url, file_type, memo } = await req.json();
    if (!url) return NextResponse.json({ error: "url は必須です" }, { status: 400 });

    const doc = await prisma.propertyDocument.create({
      data: {
        property_id: params.id,
        name: name || "資料",
        url,
        file_type: file_type || "pdf",
        memo: memo ?? null,
      },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties/[id]/documents error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/properties/[id]/documents?docId=xxx
export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("docId");
    if (!docId) return NextResponse.json({ error: "docId が必要です" }, { status: 400 });

    await prisma.propertyDocument.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/properties/[id]/documents error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
