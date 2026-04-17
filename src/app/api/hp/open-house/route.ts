import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const properties = await prisma.property.findMany({
    where: {
      is_open_house: true,
      status: "PUBLISHED",
      open_house_end: { gte: now },
    },
    orderBy: { open_house_start: "asc" },
    take: 6,
    include: {
      images: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          url: true,
          order: true,
          caption: true,
          room_type: true,
        },
      },
    },
  });
  return NextResponse.json({ properties });
}
