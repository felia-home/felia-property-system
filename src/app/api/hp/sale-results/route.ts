import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await prisma.saleResult.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("sale-results error:", error);
    return NextResponse.json({ results: [] });
  }
}
