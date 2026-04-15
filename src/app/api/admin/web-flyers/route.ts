import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const flyers = await prisma.webFlyer.findMany({ orderBy: { sort_order: "asc" } });
  return NextResponse.json({ flyers });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    name?: string;
    distribute_month?: string;
    front_image_url?: string;
    back_image_url?: string;
    pdf_url?: string;
    is_active?: boolean;
    sort_order?: number;
  };
  const flyer = await prisma.webFlyer.create({
    data: {
      name: body.name ?? "",
      distribute_month: body.distribute_month ?? "",
      front_image_url: body.front_image_url || null,
      back_image_url: body.back_image_url || null,
      pdf_url: body.pdf_url || null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    },
  });
  return NextResponse.json(flyer);
}
