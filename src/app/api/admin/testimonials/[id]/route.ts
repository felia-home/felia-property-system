import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const body = await request.json() as {
    name?: string;
    email?: string | null;
    display_name?: string;
    image_url?: string | null;
    title?: string;
    trigger_text?: string | null;
    decision_text?: string | null;
    impression_text?: string | null;
    advice_text?: string | null;
    final_text?: string | null;
    staff_id?: string | null;
    status?: string;
    sort_order?: number;
  };
  const testimonial = await prisma.testimonial.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.display_name !== undefined && { display_name: body.display_name }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.trigger_text !== undefined && { trigger_text: body.trigger_text }),
      ...(body.decision_text !== undefined && { decision_text: body.decision_text }),
      ...(body.impression_text !== undefined && { impression_text: body.impression_text }),
      ...(body.advice_text !== undefined && { advice_text: body.advice_text }),
      ...(body.final_text !== undefined && { final_text: body.final_text }),
      ...(body.staff_id !== undefined && { staff_id: body.staff_id }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    },
  });
  return NextResponse.json(testimonial);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  await prisma.testimonial.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
