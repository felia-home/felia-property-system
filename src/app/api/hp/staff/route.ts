import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staffList = await prisma.staff.findMany({
      where: {
        published_hp: true,
        is_active: true,
      },
      orderBy: { hp_order: "asc" },
      select: {
        id: true,
        name: true,
        name_kana: true,
        nickname: true,
        position: true,
        department: true,
        photo_url: true,
        bio: true,
        catchphrase: true,
        qualification: true,
        favorite_word: true,
        hobby: true,
        memorable_client: true,
        sub_image_url_1: true,
        sub_image_url_2: true,
        qualifications: true,
        specialty_areas: true,
        specialty_types: true,
        hp_order: true,
        published_hp: true,
        store: { select: { name: true } },
      },
    });

    const formatted = staffList.map(s => ({
      id: s.id,
      name: s.name,
      name_kana: s.name_kana,
      nickname: s.nickname,
      position: s.position,
      department: s.department,
      store_name: s.store?.name ?? null,
      photo_url: s.photo_url,
      bio: s.bio,
      catchphrase: s.catchphrase,
      qualification: s.qualification,
      favorite_word: s.favorite_word,
      hobby: s.hobby,
      memorable_client: s.memorable_client,
      sub_images: [s.sub_image_url_1, s.sub_image_url_2].filter(Boolean),
      qualifications: s.qualifications,
      specialty_areas: s.specialty_areas,
      specialty_types: s.specialty_types,
      sort_order: s.hp_order,
    }));

    return NextResponse.json({ staff: formatted });
  } catch (error) {
    console.error("hp/staff error:", error);
    return NextResponse.json({ staff: [] });
  }
}
