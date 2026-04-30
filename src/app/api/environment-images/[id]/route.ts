import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PATCH /api/environment-images/[id]
// body: { facility_name?, facility_type?, city? | area?, address?, caption? }
// 注: モデルには `city` カラムがあり `area` はないため、
//     リクエストの `area` も `city` フィールドにマップする
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.facility_name !== undefined) {
    data.facility_name = body.facility_name ? String(body.facility_name) : null;
  }
  if (body.facility_type !== undefined) {
    data.facility_type = String(body.facility_type || "OTHER");
  }
  if (body.city !== undefined) {
    data.city = body.city ? String(body.city) : null;
  } else if (body.area !== undefined) {
    data.city = body.area ? String(body.area) : null;
  }
  if (body.address !== undefined) {
    data.address = body.address ? String(body.address) : null;
  }
  if (body.caption !== undefined) {
    data.caption = body.caption ? String(body.caption) : null;
  }

  const image = await prisma.propertyEnvironmentImage.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json({ image });
}

// DELETE /api/environment-images/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.propertyEnvironmentImage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
