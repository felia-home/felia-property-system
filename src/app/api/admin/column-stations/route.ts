import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stations = await prisma.columnStation.findMany({
    orderBy: [{ station_line: "asc" }, { station_name: "asc" }],
  });
  return NextResponse.json({ stations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { station_line, station_name, area } = await req.json() as {
    station_line?: string;
    station_name?: string;
    area?: string;
  };
  if (!station_line || !station_name) {
    return NextResponse.json({ error: "路線名・駅名は必須です" }, { status: 400 });
  }

  const station = await prisma.columnStation.upsert({
    where: { station_line_station_name: { station_line, station_name } },
    create: { station_line, station_name, area: area ?? null },
    update: { area: area ?? null },
  });
  return NextResponse.json({ station });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.columnStation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
