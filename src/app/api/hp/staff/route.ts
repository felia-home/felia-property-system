import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recruitOnly = searchParams.get("recruit") === "true";

    const staffList = await prisma.staff.findMany({
      where: {
        published_hp: true,
        is_active: true,
        ...(recruitOnly ? { show_on_recruit: true } : {}),
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
        daily_mindset: true,
        qualifications: true,
        specialty_areas: true,
        specialty_types: true,
        hp_order: true,
        published_hp: true,
        show_on_recruit: true,
        joined_at: true,
        motto: true,
        favorite: true,
        interview_q1: true,
        interview_q2: true,
        interview_q3: true,
        interview_q4: true,
        interview_q5: true,
        interview_q6: true,
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
      daily_mindset: s.daily_mindset,
      sub_images: [s.sub_image_url_1, s.sub_image_url_2].filter(Boolean),
      qualifications: s.qualifications,
      specialty_areas: s.specialty_areas,
      specialty_types: s.specialty_types,
      sort_order: s.hp_order,
      show_on_recruit: s.show_on_recruit,
      joined_at: s.joined_at,
      motto: s.motto,
      favorite: s.favorite,
      interview_q1: s.interview_q1,
      interview_q2: s.interview_q2,
      interview_q3: s.interview_q3,
      interview_q4: s.interview_q4,
      interview_q5: s.interview_q5,
      interview_q6: s.interview_q6,
    }));

    return NextResponse.json({ staff: formatted });
  } catch (error) {
    console.error("hp/staff error:", error);
    return NextResponse.json({ staff: [] });
  }
}
