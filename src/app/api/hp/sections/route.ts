import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await prisma.hpSection.findMany({
      orderBy: { sort_order: "asc" },
      select: {
        section_key: true,
        label: true,
        is_visible: true,
        sort_order: true,
        heading: true,
        subheading: true,
      },
    });
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("hp/sections error:", error);
    return NextResponse.json({ sections: [] });
  }
}
