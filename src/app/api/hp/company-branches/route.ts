import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branches = await prisma.companyBranch.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        name: true,
        postal_code: true,
        address: true,
        phone: true,
        fax: true,
        access_text: true,
        lat: true,
        lng: true,
        is_active: true,
        sort_order: true,
      },
    });

    const formatted = branches.map(b => ({
      ...b,
      lat: b.lat ? Number(b.lat) : null,
      lng: b.lng ? Number(b.lng) : null,
    }));

    return NextResponse.json({ branches: formatted });
  } catch (error) {
    console.error("company-branches error:", error);
    return NextResponse.json({ branches: [] });
  }
}
