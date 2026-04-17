import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const sections = await prisma.hpSection.findMany({
    orderBy: { sort_order: "asc" },
  });
  return NextResponse.json({ sections });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as {
    sections: Array<{
      id: string;
      sort_order: number;
      is_visible: boolean;
      heading?: string | null;
      subheading?: string | null;
    }>;
  };

  await Promise.all(
    body.sections.map((s) =>
      prisma.hpSection.update({
        where: { id: s.id },
        data: {
          sort_order: s.sort_order,
          is_visible: s.is_visible,
          heading: s.heading ?? null,
          subheading: s.subheading ?? null,
        },
      })
    )
  );

  return NextResponse.json({ success: true });
}
