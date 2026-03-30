import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { generateChecklist, getPendingTasks } from "@/lib/property-checklist";

// ── Photo stats helper ─────────────────────────────────────────────────────────

async function updatePhotoStats(propertyId: string) {
  const images = await prisma.propertyImage.findMany({
    where: { property_id: propertyId },
    select: { room_type: true },
  });

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return;

  const hasExterior = images.some(i => i.room_type === "外観");
  const hasFloorPlan = images.some(i => i.room_type === "間取り図");
  const hasInterior = images.some(i =>
    ["リビング", "キッチン", "洋室", "和室", "主寝室", "バスルーム"].includes(i.room_type ?? "")
  );

  // Auto-transition PHOTO_NEEDED → PUBLISHING when requirements are met
  const photoRequirementMet = images.length >= 5 && hasExterior && hasFloorPlan;
  const newStatus =
    property.status === "PHOTO_NEEDED" && photoRequirementMet ? "PUBLISHING" : undefined;

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      photo_count: images.length,
      photo_has_exterior: hasExterior,
      photo_has_floor_plan: hasFloorPlan,
      photo_has_interior: hasInterior,
      photo_last_updated_at: new Date(),
      ...(newStatus ? { status: newStatus } : {}),
    },
  });

  // Recalculate pending_tasks
  const updatedProp = await prisma.property.findUnique({ where: { id: propertyId } });
  if (updatedProp) {
    const checks = generateChecklist({ ...updatedProp, images });
    const pending = getPendingTasks(checks);
    await prisma.property.update({ where: { id: propertyId }, data: { pending_tasks: pending } });
  }
}

// ── GET /api/properties/[id]/images ───────────────────────────────────────────

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

// ── POST /api/properties/[id]/images — multipart/form-data upload ─────────────

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

    const lastImage = await prisma.propertyImage.findFirst({
      where: { property_id: params.id },
      orderBy: { order: "desc" },
    });
    let nextOrder = (lastImage?.order ?? -1) + 1;

    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, file.name, "properties");

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

    // Update photo stats after upload
    await updatePhotoStats(params.id);

    return NextResponse.json({ images: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties/[id]/images error:", error);
    return NextResponse.json({ error: "写真のアップロードに失敗しました" }, { status: 500 });
  }
}
