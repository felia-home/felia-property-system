import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/hp/area-columns?area=渋谷区&station=四谷三丁目&line=東京メトロ丸ノ内線
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area         = searchParams.get("area") ?? "";
  const station_name = searchParams.get("station") ?? "";
  const station_line = searchParams.get("line") ?? "";

  const where: Record<string, unknown> = { is_active: true };
  if (area) where["area"] = area;

  if (station_name || station_line) {
    where["stations"] = {
      some: {
        station: {
          ...(station_name ? { station_name: { contains: station_name } } : {}),
          ...(station_line ? { station_line: { contains: station_line } } : {}),
        },
      },
    };
  }

  const columns = await prisma.areaColumn.findMany({
    where,
    orderBy: [{ sort_order: "asc" }, { published_at: "desc" }],
    include: {
      stations: {
        include: {
          station: {
            select: { id: true, station_line: true, station_name: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ columns });
}
