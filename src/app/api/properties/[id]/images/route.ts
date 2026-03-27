import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

// GET /api/properties/[id]/images
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const images = await prisma.propertyImage.findMany({
      where: { property_id: params.id },
      orderBy: [{ order: "asc" }, { created_at: "asc" }],
    });
    return NextResponse.json({ images });
  } catch (error) {
    console.error("GET /api/properties/[id]/images error:", error);
    return NextResponse.json({ error: "写真一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/properties/[id]/images — multipart/form-data upload
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }

    // Get current max order
    const lastImage = await prisma.propertyImage.findFirst({
      where: { property_id: params.id },
      orderBy: { order: "desc" },
    });
    let nextOrder = (lastImage?.order ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, file.name, "properties");

      // First uploaded image becomes main if none exists
      const existingCount = await prisma.propertyImage.count({
        where: { property_id: params.id },
      });

      const image = await prisma.propertyImage.create({
        data: {
          property_id: params.id,
          url: result.url,
          filename: result.filename,
          file_size: result.file_size,
          mime_type: result.mime_type,
          order: nextOrder++,
          is_main: existingCount === 0,
        },
      });
      created.push(image);
    }

    return NextResponse.json({ images: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties/[id]/images error:", error);
    return NextResponse.json({ error: "写真のアップロードに失敗しました" }, { status: 500 });
  }
}
