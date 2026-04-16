import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const branches = await prisma.companyBranch.findMany({
    orderBy: { sort_order: "asc" },
  });
  return NextResponse.json({
    branches: branches.map(b => ({
      ...b,
      lat: b.lat ? Number(b.lat) : null,
      lng: b.lng ? Number(b.lng) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    postal_code?: string;
    address?: string;
    phone?: string;
    fax?: string;
    access_text?: string;
    lat?: string | number | null;
    lng?: string | number | null;
    is_active?: boolean;
    sort_order?: number;
  };

  const branch = await prisma.companyBranch.create({
    data: {
      name: body.name ?? "",
      postal_code: body.postal_code || null,
      address: body.address ?? "",
      phone: body.phone || null,
      fax: body.fax || null,
      access_text: body.access_text || null,
      lat: body.lat ? parseFloat(String(body.lat)) : null,
      lng: body.lng ? parseFloat(String(body.lng)) : null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    },
  });
  return NextResponse.json({
    ...branch,
    lat: branch.lat ? Number(branch.lat) : null,
    lng: branch.lng ? Number(branch.lng) : null,
  });
}
