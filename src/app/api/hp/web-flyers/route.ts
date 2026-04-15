import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const flyers = await prisma.webFlyer.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });
    return NextResponse.json({ flyers });
  } catch (error) {
    console.error("web-flyers error:", error);
    return NextResponse.json({ flyers: [] });
  }
}
