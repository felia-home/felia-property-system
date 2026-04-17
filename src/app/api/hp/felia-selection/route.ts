import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const properties = await prisma.property.findMany({
    where: { is_felia_selection: true, status: "PUBLISHED" },
    orderBy: { published_at: "desc" },
    take: 10,
    include: {
      images: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          url: true,
          order: true,
        },
      },
    },
  });
  return NextResponse.json({ properties });
}
