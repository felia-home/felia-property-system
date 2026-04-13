import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const banners = await prisma.banner.findMany({
    where: { is_active: true },
    orderBy: [{ position: "asc" }, { slot: "asc" }],
  });
  return NextResponse.json({ banners });
}
