import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const station_ids = body.station_ids as string[] | undefined;

  const data: Record<string, unknown> = {};
  if (body.area      !== undefined) data.area      = String(body.area);
  if (body.title     !== undefined) data.title     = String(body.title);
  if (body.content   !== undefined) data.content   = body.content   ? String(body.content)   : null;
  if (body.image_url !== undefined) data.image_url = body.image_url ? String(body.image_url) : null;
  if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);
  if (body.sort_order !== undefined) data.sort_order = Number(body.sort_order);
  if (body.published_at !== undefined) {
    data.published_at = body.published_at ? new Date(String(body.published_at)) : null;
  }

  // 駅との紐付けを置き換える場合、既存を削除してから再作成
  if (station_ids !== undefined) {
    await prisma.areaColumnStation.deleteMany({ where: { column_id: params.id } });
    data.stations = {
      create: station_ids.map((sid) => ({
        station: { connect: { id: sid } },
      })),
    };
  }

  const column = await prisma.areaColumn.update({
    where: { id: params.id },
    data,
    include: { stations: { include: { station: true } } },
  });
  return NextResponse.json({ column });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.areaColumn.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
