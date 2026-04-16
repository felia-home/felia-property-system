import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    postal_code?: string | null;
    address?: string;
    phone?: string | null;
    fax?: string | null;
    access_text?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
    is_active?: boolean;
    sort_order?: number;
  };

  const branch = await prisma.companyBranch.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.postal_code !== undefined && { postal_code: body.postal_code }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.fax !== undefined && { fax: body.fax }),
      ...(body.access_text !== undefined && { access_text: body.access_text }),
      ...(body.lat !== undefined && { lat: body.lat ? parseFloat(String(body.lat)) : null }),
      ...(body.lng !== undefined && { lng: body.lng ? parseFloat(String(body.lng)) : null }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    },
  });
  return NextResponse.json({
    ...branch,
    lat: branch.lat ? Number(branch.lat) : null,
    lng: branch.lng ? Number(branch.lng) : null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  await prisma.companyBranch.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
