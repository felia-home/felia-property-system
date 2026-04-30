import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { analyzeEnvironmentImage } from "@/agents/image-analyzer";

// GET /api/environment-images?lat=xxx&lng=xxx&radius=1200&city=xxx&type=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radiusStr = searchParams.get("radius");
    const city = searchParams.get("city");
    const facility_type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (facility_type) where.facility_type = facility_type;
    if (city) where.city = { contains: city };

    const images = await prisma.propertyEnvironmentImage.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 100,
    });

    // If lat/lng given, filter by radius in JS (avoids PostGIS dependency)
    if (lat && lng) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      const radiusKm = (parseFloat(radiusStr ?? "1200") / 1000);
      const filtered = images.filter((img) => {
        if (img.latitude == null || img.longitude == null) return false;
        const dlat = img.latitude - latN;
        const dlng = img.longitude - lngN;
        // Rough Euclidean approx in degrees → km at ~35°N
        const distKm = Math.sqrt(dlat * dlat * 111 * 111 + dlng * dlng * 91 * 91);
        return distKm <= radiusKm;
      });
      return NextResponse.json({ images: filtered });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("GET /api/environment-images error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/environment-images — upload new environment photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });

    const facility_type = String(formData.get("facility_type") ?? "OTHER");
    const facility_name = formData.get("facility_name") ? String(formData.get("facility_name")) : null;
    const city = formData.get("city") ? String(formData.get("city")) : null;
    const address = formData.get("address") ? String(formData.get("address")) : null;
    const latitude = formData.get("latitude") ? parseFloat(String(formData.get("latitude"))) : null;
    const longitude = formData.get("longitude") ? parseFloat(String(formData.get("longitude"))) : null;
    const caption = formData.get("caption") ? String(formData.get("caption")) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(buffer, file.name, "environment");

    const image = await prisma.propertyEnvironmentImage.create({
      data: {
        url: uploaded.url,
        filename: uploaded.filename,
        facility_type,
        facility_name,
        city,
        address,
        latitude,
        longitude,
        caption,
      },
    });

    // Async AI analysis (fire and forget)
    prisma.propertyEnvironmentImage
      .findUnique({ where: { id: image.id } })
      .then(async (img) => {
        if (!img) return;
        try {
          const analysis = await analyzeEnvironmentImage(img.url);
          await prisma.propertyEnvironmentImage.update({
            where: { id: img.id },
            data: {
              facility_type: analysis.facility_type || img.facility_type,
              ai_caption: analysis.ai_caption,
            },
          });
        } catch { /* ignore */ }
      });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("POST /api/environment-images error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
