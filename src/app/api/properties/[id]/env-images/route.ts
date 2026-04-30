import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/properties/[id]/env-images
// multipart/form-data:
//   file (File, 必須)
//   facility_name (string, 任意)
//   facility_type (string, 任意 — デフォルト OTHER)
//   latitude / longitude (number string, 任意)
// もしくは JSON:
//   { url, facility_name, facility_type?, latitude?, longitude? }
//
// 物件IDに紐づく PropertyEnvironmentImage を作成し、PropertyEnvImageLink で紐付ける
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 物件の存在確認
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    select: { id: true, city: true },
  });
  if (!property) {
    return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  let url: string;
  let filename: string;
  let facility_name: string | null = null;
  let facility_type: string = "OTHER";
  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });

      facility_name = formData.get("facility_name") ? String(formData.get("facility_name")) : null;
      facility_type = String(formData.get("facility_type") ?? "OTHER");
      const latRaw = formData.get("latitude");
      const lngRaw = formData.get("longitude");
      latitude  = latRaw && latRaw !== "" ? parseFloat(String(latRaw)) : null;
      longitude = lngRaw && lngRaw !== "" ? parseFloat(String(lngRaw)) : null;

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadFile(buffer, file.name, "environment");
      url      = uploaded.url;
      filename = uploaded.filename;
    } else {
      const body = await req.json() as {
        url?: string;
        filename?: string;
        facility_name?: string;
        facility_type?: string;
        latitude?: number | null;
        longitude?: number | null;
      };
      if (!body.url) return NextResponse.json({ error: "url または file が必要です" }, { status: 400 });
      url           = String(body.url);
      filename      = body.filename ? String(body.filename) : url.split("/").pop() ?? "env-image";
      facility_name = body.facility_name ?? null;
      facility_type = body.facility_type ?? "OTHER";
      latitude      = body.latitude ?? null;
      longitude     = body.longitude ?? null;
    }
  } catch (e) {
    console.error("env-images parse error:", e);
    return NextResponse.json({ error: "リクエストの解析に失敗しました" }, { status: 400 });
  }

  try {
    // 同一URLの既存レコードがあれば再利用（メタデータを更新）
    // PropertyEnvironmentImage.url には @unique が無いため findFirst で代用
    const existing = await prisma.propertyEnvironmentImage.findFirst({
      where: { url },
      select: { id: true },
    });

    const envImage = existing
      ? await prisma.propertyEnvironmentImage.update({
          where: { id: existing.id },
          data: {
            facility_type,
            facility_name,
            city:      property.city ?? null,
            latitude,
            longitude,
          },
        })
      : await prisma.propertyEnvironmentImage.create({
          data: {
            url,
            filename,
            facility_type,
            facility_name,
            city:      property.city ?? null,
            latitude,
            longitude,
          },
        });

    await prisma.propertyEnvImageLink.upsert({
      where: { property_id_image_id: { property_id: params.id, image_id: envImage.id } },
      create: { property_id: params.id, image_id: envImage.id },
      update: {},
    });

    return NextResponse.json({ image: envImage }, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error("env-images create error:", e);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// GET /api/properties/[id]/env-images
// 物件にリンクされた周辺環境写真の一覧
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.propertyEnvImageLink.findMany({
    where: { property_id: params.id },
    include: { env_image: true },
    orderBy: { created_at: "desc" },
  });

  const images = links.map(l => l.env_image);
  return NextResponse.json({ images });
}
