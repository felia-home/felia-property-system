import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { generateChecklist, getPendingTasks } from "@/lib/property-checklist";

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
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      photo_count: images.length,
      photo_has_exterior: hasExterior,
      photo_has_floor_plan: hasFloorPlan,
      photo_has_interior: hasInterior,
      photo_last_updated_at: new Date(),
    },
  });
  const updatedProp = await prisma.property.findUnique({ where: { id: propertyId } });
  if (updatedProp) {
    const checks = generateChecklist({ ...updatedProp, images });
    const pending = getPendingTasks(checks);
    await prisma.property.update({ where: { id: propertyId }, data: { pending_tasks: pending } });
  }
}

// PATCH /api/properties/[id]/images/[imgId]
// Updates: caption, room_type, order, is_main
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; imgId: string } }
) {
  try {
    const body = await request.json();
    const allowed = ["caption", "room_type", "order", "is_main"];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    // If setting as main, clear others first
    if (data.is_main === true) {
      await prisma.propertyImage.updateMany({
        where: { property_id: params.id },
        data: { is_main: false },
      });
    }

    const image = await prisma.propertyImage.update({
      where: { id: params.imgId },
      data,
    });

    // If room_type changed, recalculate photo stats
    if ("room_type" in data) {
      await updatePhotoStats(params.id);
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("PATCH /api/properties/[id]/images/[imgId] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/properties/[id]/images/[imgId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; imgId: string } }
) {
  try {
    const image = await prisma.propertyImage.findUnique({ where: { id: params.imgId } });
    if (!image) return NextResponse.json({ error: "画像が見つかりません" }, { status: 404 });

    await prisma.propertyImage.delete({ where: { id: params.imgId } });
    await deleteFile(image.url);

    // If deleted was main, assign main to first remaining
    if (image.is_main) {
      const first = await prisma.propertyImage.findFirst({
        where: { property_id: params.id },
        orderBy: { order: "asc" },
      });
      if (first) {
        await prisma.propertyImage.update({ where: { id: first.id }, data: { is_main: true } });
      }
    }

    // Update photo stats after deletion
    await updatePhotoStats(params.id);

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("DELETE /api/properties/[id]/images/[imgId] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
