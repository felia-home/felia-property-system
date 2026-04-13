import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const properties = await prisma.property.findMany({
    where: { is_felia_selection: true, status: "PUBLISHED" },
    orderBy: { published_at: "desc" },
    take: 10,
  });
  return NextResponse.json({ properties });
}
