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
    let built_month: number | null = null;
    let structure: string | null = null;
    let floors_total: number | null = null;
    let floors_basement: number | null = null;
    let management_company: string | null = null;
    let management_type: string | null = null;
    let management_fee: number | null = null;
    let repair_reserve: number | null = null;
    let pet_allowed = false;
    let features: string[] = [];
    let parking_type: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let notes: string | null = null;
    let imageBuffer: Buffer | null = null;
    let imageFilename: string | null = null;

    const numOrNull = (v: FormDataEntryValue | string | null | undefined) =>
      v == null || v === "" ? null : Number(v);

    if (ct.includes("multipart/form-data")) {
      const formData = await request.formData();
      name               = String(formData.get("name") ?? "");
      name_kana          = formData.get("name_kana") ? String(formData.get("name_kana")) : null;
      city               = formData.get("city") ? String(formData.get("city")) : null;
      address            = formData.get("address") ? String(formData.get("address")) : null;
      total_units        = numOrNull(formData.get("total_units"));
      built_year         = numOrNull(formData.get("built_year"));
      built_month        = numOrNull(formData.get("built_month"));
      structure          = formData.get("structure") ? String(formData.get("structure")) : null;
      floors_total       = numOrNull(formData.get("floors_total"));
      floors_basement    = numOrNull(formData.get("floors_basement"));
      management_company = formData.get("management_company") ? String(formData.get("management_company")) : null;
      management_type    = formData.get("management_type") ? String(formData.get("management_type")) : null;
      management_fee     = numOrNull(formData.get("management_fee"));
      repair_reserve     = numOrNull(formData.get("repair_reserve"));
      pet_allowed        = String(formData.get("pet_allowed") ?? "") === "true";
      const featuresRaw  = formData.get("features");
      try { features    = featuresRaw ? JSON.parse(String(featuresRaw)) : []; } catch { features = []; }
      parking_type       = formData.get("parking_type") ? String(formData.get("parking_type")) : null;
      latitude           = numOrNull(formData.get("latitude"));
      longitude          = numOrNull(formData.get("longitude"));
      notes              = formData.get("notes") ? String(formData.get("notes")) : null;

      const file = formData.get("image") as File | null;
      if (file) {
        imageBuffer = Buffer.from(await file.arrayBuffer());
        imageFilename = file.name;
      }
    } else {
      const body = await request.json() as Record<string, unknown>;
      name               = String(body.name ?? "");
      name_kana          = body.name_kana          ? String(body.name_kana)          : null;
      city               = body.city               ? String(body.city)               : null;
      address            = body.address            ? String(body.address)            : null;
      total_units        = body.total_units != null && body.total_units !== ""        ? Number(body.total_units)        : null;
      built_year         = body.built_year != null && body.built_year !== ""          ? Number(body.built_year)         : null;
      built_month        = body.built_month != null && body.built_month !== ""        ? Number(body.built_month)        : null;
      structure          = body.structure          ? String(body.structure)          : null;
      floors_total       = body.floors_total != null && body.floors_total !== ""     ? Number(body.floors_total)       : null;
      floors_basement    = body.floors_basement != null && body.floors_basement !== "" ? Number(body.floors_basement)  : null;
      management_company = body.management_company ? String(body.management_company) : null;
      management_type    = body.management_type    ? String(body.management_type)    : null;
      management_fee     = body.management_fee != null && body.management_fee !== ""  ? Number(body.management_fee)    : null;
      repair_reserve     = body.repair_reserve != null && body.repair_reserve !== ""  ? Number(body.repair_reserve)    : null;
      pet_allowed        = body.pet_allowed === true || body.pet_allowed === "true";
      features           = Array.isArray(body.features) ? body.features.map(String) : [];
      parking_type       = body.parking_type       ? String(body.parking_type)       : null;
      latitude           = body.latitude != null && body.latitude !== ""              ? Number(body.latitude)           : null;
      longitude          = body.longitude != null && body.longitude !== ""            ? Number(body.longitude)          : null;
      notes              = body.notes              ? String(body.notes)              : null;
    }

    if (!name) return NextResponse.json({ error: "マンション名は必須です" }, { status: 400 });

    const mansion = await prisma.mansionBuilding.create({
      data: {
        name, name_kana, city, address,
        total_units, built_year, built_month,
        structure, floors_total, floors_basement,
        management_company, management_type, management_fee, repair_reserve,
        pet_allowed, features, parking_type,
        latitude, longitude, notes,
      },
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
