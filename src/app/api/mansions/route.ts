import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

// GET /api/mansions           — 全件一覧
// GET /api/mansions?id=xxx    — 1件取得
// GET /api/mansions?q=xxx     — 名前検索（オートコンプリート）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const q = searchParams.get("q") ?? searchParams.get("name") ?? "";

    if (id) {
      const mansion = await prisma.mansionBuilding.findUnique({
        where: { id },
        include: { exterior_images: { orderBy: { is_primary: "desc" } } },
      });
      if (!mansion) return NextResponse.json({ error: "マンションが見つかりません" }, { status: 404 });
      return NextResponse.json({ mansion });
    }

    const mansions = await prisma.mansionBuilding.findMany({
      where: q ? { name: { contains: q } } : undefined,
      include: {
        exterior_images: {
          orderBy: { created_at: "asc" },
          take: 5,
          select: {
            id: true,
            url: true,
            filename: true,
            caption: true,
            is_primary: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ mansions });
  } catch (error) {
    console.error("GET /api/mansions error:", error);
    return NextResponse.json({ mansions: [] }, { status: 500 });
  }
}

// POST /api/mansions — create new mansion building
// Accepts JSON or multipart/form-data (with exterior image)
export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get("content-type") ?? "";

    let name = "";
    let name_kana: string | null = null;
    let city: string | null = null;
    let address: string | null = null;
    let total_units: number | null = null;
    let built_year: number | null = null;
    let imageBuffer: Buffer | null = null;
    let imageFilename: string | null = null;

    if (ct.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = String(formData.get("name") ?? "");
      name_kana = formData.get("name_kana") ? String(formData.get("name_kana")) : null;
      city = formData.get("city") ? String(formData.get("city")) : null;
      address = formData.get("address") ? String(formData.get("address")) : null;
      total_units = formData.get("total_units") ? Number(formData.get("total_units")) : null;
      built_year = formData.get("built_year") ? Number(formData.get("built_year")) : null;

      const file = formData.get("image") as File | null;
      if (file) {
        imageBuffer = Buffer.from(await file.arrayBuffer());
        imageFilename = file.name;
      }
    } else {
      const body = await request.json();
      name = String(body.name ?? "");
      name_kana = body.name_kana ?? null;
      city = body.city ?? null;
      address = body.address ?? null;
      total_units = body.total_units ? Number(body.total_units) : null;
      built_year = body.built_year ? Number(body.built_year) : null;
    }

    if (!name) return NextResponse.json({ error: "マンション名は必須です" }, { status: 400 });

    const mansion = await prisma.mansionBuilding.create({
      data: { name, name_kana, city, address, total_units, built_year },
      include: { exterior_images: true },
    });

    if (imageBuffer && imageFilename) {
      const uploaded = await uploadFile(imageBuffer, imageFilename, "mansions");
      await prisma.mansionExteriorImage.create({
        data: {
          mansion_id: mansion.id,
          url: uploaded.url,
          filename: uploaded.filename,
          is_primary: true,
        },
      });
    }

    return NextResponse.json({ mansion }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mansions error:", error);
    return NextResponse.json({ error: "マンション登録に失敗しました" }, { status: 500 });
  }
}
