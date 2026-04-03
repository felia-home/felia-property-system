import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      name_kana: true,
      phone: true,
      prefecture: true,
      city: true,
      budget_min: true,
      budget_max: true,
      desired_area: true,
      desired_type: true,
      created_at: true,
      last_login_at: true,
      inquiries: {
        orderBy: { created_at: "desc" },
        take: 10,
      },
    },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const member = await prisma.member.update({
      where: { id: params.id },
      data: {
        name: data.name,
        name_kana: data.name_kana,
        phone: data.phone,
        prefecture: data.prefecture,
        city: data.city,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        desired_area: data.desired_area,
        desired_type: data.desired_type,
      },
    });
    return NextResponse.json({ success: true, member });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
