import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const permission = (session.user as { permission?: string })?.permission ?? "";
  if (!["ADMIN", "SENIOR_MANAGER"].includes(permission)) {
    return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });
  }

  const body = await request.json() as { subject?: string; body_html?: string };
  const { subject, body_html } = body;

  if (!subject || !body_html) {
    return NextResponse.json({ error: "件名と本文は必須です" }, { status: 400 });
  }

  const updated = await prisma.emailTemplate.update({
    where: { template_key: params.key },
    data: { subject, body_html },
  });

  return NextResponse.json(updated);
}
