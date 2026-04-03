import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDFファイルのみアップロード可能です" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Use "properties" subdir (existing), or extend storage.ts later
    const result = await uploadFile(buffer, file.name, "properties");

    const property = await prisma.privateProperty.update({
      where: { id: params.id },
      data: { myosoku_url: result.url, myosoku_filename: file.name },
      include: { agent: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error("POST /api/private-properties/[id]/myosoku error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
