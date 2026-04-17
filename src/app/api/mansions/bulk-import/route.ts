import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ImportImage {
  url: string;
  filename: string;
}

interface ImportMansion {
  name: string;
  city?: string;    // 区名
  address?: string; // 町名
  images: ImportImage[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const body = await req.json();
    const mansions: ImportMansion[] = body.mansions ?? [];

    if (!mansions.length) {
      return NextResponse.json({ error: "データがありません" }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const m of mansions) {
      if (!m.name?.trim()) {
        results.errors.push("マンション名が空のデータをスキップしました");
        continue;
      }

      const existing = await prisma.mansionBuilding.findFirst({
        where: { name: m.name.trim() },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      const mansion = await prisma.mansionBuilding.create({
        data: {
          name: m.name.trim(),
          city: m.city?.trim() || null,
          address: m.address?.trim() || null,
          prefecture: "東京都",
        },
      });

      for (let i = 0; i < m.images.length; i++) {
        const img = m.images[i];
        await prisma.mansionExteriorImage.create({
          data: {
            mansion_id: mansion.id,
            url: img.url,
            filename: img.filename,
            is_primary: i === 0,
          },
        });
      }

      results.created++;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("bulk-import error:", error);
    return NextResponse.json({ error: "インポートに失敗しました" }, { status: 500 });
  }
}
