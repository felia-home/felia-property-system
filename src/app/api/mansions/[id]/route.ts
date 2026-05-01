import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/mansions/[id] — 単体取得
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const mansion = await prisma.mansionBuilding.findUnique({
    where: { id: params.id },
    include: { exterior_images: { orderBy: { is_primary: "desc" } } },
  });
  if (!mansion) {
    return NextResponse.json({ error: "マンションが見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ mansion });
}

// PATCH /api/mansions/[id] — 編集
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json() as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  const setStr = (k: string) => {
    if (body[k] !== undefined) data[k] = body[k] ? String(body[k]) : null;
  };
  const setNum = (k: string) => {
    if (body[k] !== undefined) {
      data[k] = body[k] == null || body[k] === "" ? null : Number(body[k]);
    }
  };
  const setBool = (k: string) => {
    if (body[k] !== undefined) data[k] = body[k] === true || body[k] === "true";
  };

  setStr("name");
  setStr("name_kana");
  setStr("prefecture");
  setStr("city");
  setStr("address");
  setNum("total_units");
  setNum("built_year");
  setNum("built_month");
  setStr("structure");
  setNum("floors_total");
  setNum("floors_basement");
  setStr("management_company");
  setStr("management_type");
  setNum("management_fee");
  setNum("repair_reserve");
  setBool("pet_allowed");
  setStr("parking_type");
  setNum("latitude");
  setNum("longitude");
  setStr("notes");
  if (Array.isArray(body.features)) data.features = (body.features as unknown[]).map(String);

  const mansion = await prisma.mansionBuilding.update({
    where: { id: params.id },
    data,
    include: { exterior_images: { orderBy: { is_primary: "desc" } } },
  });
  return NextResponse.json({ mansion });
}

// DELETE /api/mansions/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.mansionBuilding.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
