import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        store: { select: { name: true } },
      },
    });

    if (!staff || !staff.published_hp || !staff.is_active) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.name,
        name_kana: staff.name_kana,
        nickname: staff.nickname,
        position: staff.position,
        department: staff.department,
        store_name: staff.store?.name ?? null,
        photo_url: staff.photo_url,
        bio: staff.bio,
        catchphrase: staff.catchphrase,
        qualification: staff.qualification,
        favorite_word: staff.favorite_word,
        hobby: staff.hobby,
        memorable_client: staff.memorable_client,
        daily_mindset: staff.daily_mindset,
        sub_images: [staff.sub_image_url_1, staff.sub_image_url_2].filter(Boolean),
        qualifications: staff.qualifications,
        specialty_areas: staff.specialty_areas,
        specialty_types: staff.specialty_types,
        sort_order: staff.hp_order,
      },
    });
  } catch (error) {
    console.error("hp/staff/[id] error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
