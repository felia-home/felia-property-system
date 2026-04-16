import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const company = await prisma.companySetting.findFirst({
    orderBy: { created_at: "asc" },
  });
  return NextResponse.json({ company });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const permission = (session.user as { permission?: string })?.permission ?? "";
  if (!["ADMIN", "SENIOR_MANAGER"].includes(permission)) {
    return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });
  }

  const body = await request.json() as {
    name?: string;
    postal_code?: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    hours?: string;
    holiday?: string;
    license?: string;
    access_text?: string;
    lat?: string | number | null;
    lng?: string | number | null;
  };

  const data = {
    name: body.name ?? "株式会社フェリアホーム",
    postal_code: body.postal_code || null,
    address: body.address || null,
    phone: body.phone || null,
    fax: body.fax || null,
    email: body.email || null,
    hours: body.hours || null,
    holiday: body.holiday || null,
    license: body.license || null,
    access_text: body.access_text || null,
    lat: body.lat ? parseFloat(String(body.lat)) : null,
    lng: body.lng ? parseFloat(String(body.lng)) : null,
  };

  const existing = await prisma.companySetting.findFirst();

  const company = existing
    ? await prisma.companySetting.update({ where: { id: existing.id }, data })
    : await prisma.companySetting.create({ data });

  return NextResponse.json({ company });
}
