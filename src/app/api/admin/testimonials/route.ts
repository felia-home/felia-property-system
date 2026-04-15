import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const testimonials = await prisma.testimonial.findMany({
    orderBy: { created_at: "desc" },
    include: { staff: { select: { name: true } } },
  });
  return NextResponse.json({ testimonials });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    name?: string;
    email?: string;
    display_name?: string;
    image_url?: string;
    title?: string;
    trigger_text?: string;
    decision_text?: string;
    impression_text?: string;
    advice_text?: string;
    final_text?: string;
    staff_id?: string;
    status?: string;
    sort_order?: number;
  };
  const testimonial = await prisma.testimonial.create({
    data: {
      name: body.name ?? "",
      email: body.email || null,
      display_name: body.display_name ?? "",
      image_url: body.image_url || null,
      title: body.title ?? "",
      trigger_text: body.trigger_text || null,
      decision_text: body.decision_text || null,
      impression_text: body.impression_text || null,
      advice_text: body.advice_text || null,
      final_text: body.final_text || null,
      staff_id: body.staff_id || null,
      status: body.status || "PENDING",
      sort_order: body.sort_order ?? 0,
    },
  });
  return NextResponse.json(testimonial);
}
