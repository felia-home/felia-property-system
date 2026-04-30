import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/area-columns
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const columns = await prisma.areaColumn.findMany({
    orderBy: [{ area: "asc" }, { sort_order: "asc" }],
  });
  return NextResponse.json({ columns });
}

// POST /api/admin/area-columns
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const data = {
    area:         String(body.area ?? ""),
    title:        String(body.title ?? ""),
    content:      body.content      ? String(body.content)      : null,
    image_url:    body.image_url    ? String(body.image_url)    : null,
    is_active:    body.is_active !== false,
    sort_order:   body.sort_order != null ? Number(body.sort_order) : 0,
    published_at: body.published_at ? new Date(String(body.published_at)) : null,
  };

  if (!data.area || !data.title) {
    return NextResponse.json({ error: "area と title は必須です" }, { status: 400 });
  }

  const column = await prisma.areaColumn.create({ data });
  return NextResponse.json({ column });
}
