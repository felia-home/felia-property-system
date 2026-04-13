import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const features = await prisma.feature.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    take: 6,
  });
  return NextResponse.json({ features });
}
