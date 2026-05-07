import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await prisma.saleResult.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { sale_year: "desc" }, { sale_month: "desc" }],
      select: {
        id: true,
        sale_year: true,
        sale_month: true,
        year_month: true,
        area_ward: true,
        area_town: true,
        area: true,
        property_type: true,
        floor_plan_image_url: true,
        image_url_1: true,
        comment: true,
        sort_order: true,
        latitude: true,
        longitude: true,
        staff: {
          select: {
            id: true,
            name: true,
            position: true,
            photo_url: true,
            photo_focal_x: true,
            photo_focal_y: true,
          },
        },
      },
    });

    const formatted = results.map((r) => ({
      id: r.id,
      sale_year: r.sale_year ?? (r.year_month ? parseInt(r.year_month.split("-")[0]) : null),
      sale_month: r.sale_month ?? (r.year_month ? parseInt(r.year_month.split("-")[1]) : null),
      area_ward: r.area_ward ?? r.area ?? null,
      area_town: r.area_town ?? null,
      property_type: r.property_type,
      floor_plan_image_url: r.floor_plan_image_url ?? r.image_url_1 ?? null,
      comment: r.comment,
      sort_order: r.sort_order,
      latitude: r.latitude,
      longitude: r.longitude,
      staff: r.staff
        ? {
            id:             r.staff.id,
            name:           r.staff.name,
            position:       r.staff.position,
            photo_url:      r.staff.photo_url,
            photo_focal_x:  r.staff.photo_focal_x ?? 50,
            photo_focal_y:  r.staff.photo_focal_y ?? 50,
          }
        : null,
    }));

    return NextResponse.json({ sale_results: formatted });
  } catch (error) {
    console.error("hp/sale-results error:", error);
    return NextResponse.json({ sale_results: [] });
  }
}
