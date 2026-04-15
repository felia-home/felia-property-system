import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
      select: {
        id: true,
        display_name: true,
        image_url: true,
        title: true,
        trigger_text: true,
        decision_text: true,
        impression_text: true,
        advice_text: true,
        final_text: true,
        staff: { select: { name: true } },
      },
    });
    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("testimonials error:", error);
    return NextResponse.json({ testimonials: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?: string;
      email?: string;
      display_name?: string;
      title?: string;
      trigger_text?: string;
      decision_text?: string;
      impression_text?: string;
      advice_text?: string;
      final_text?: string;
    };
    const { name, email, display_name, title, trigger_text, decision_text, impression_text, advice_text, final_text } = body;

    if (!name || !display_name || !title) {
      return NextResponse.json(
        { error: "お名前・表示名・タイトルは必須です" },
        { status: 400 }
      );
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        email: email || null,
        display_name,
        title,
        trigger_text: trigger_text || null,
        decision_text: decision_text || null,
        impression_text: impression_text || null,
        advice_text: advice_text || null,
        final_text: final_text || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, id: testimonial.id });
  } catch (error) {
    console.error("testimonial post error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
