import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const INTERVIEW_LABELS = [
  "自社の強み",
  "会社の雰囲気",
  "あれば望ましい経験や能力",
  "どのような人が向いているか",
  "仕事として楽しいエピソード",
  "これから入社する人へのメッセージ",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recruitOnly = searchParams.get("recruit") === "true";

    const staffList = await prisma.staff.findMany({
      where: {
        is_active: true,
        ...(recruitOnly
          ? { show_on_recruit: true }
          : { published_hp: true }),
      },
      orderBy: [
        { hp_order: "asc" },
        { created_at: "asc" },
      ],
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

    const staffs = staffList.map(s => ({
      id: s.id,
      name: s.name,
      name_kana: s.name_kana,
      nickname: s.nickname,
      position: s.position,
      department: s.department,
      store_name: s.store?.name ?? "",
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
      interviews: [1, 2, 3, 4, 5, 6]
        .map(n => ({
          question: INTERVIEW_LABELS[n - 1],
          answer: (s as unknown as Record<string, string | null>)[`interview_q${n}`] ?? "",
        }))
        .filter(item => item.answer),
    }));

    return NextResponse.json({ staffs });
  } catch (error) {
    console.error("hp/staff error:", error);
    return NextResponse.json({ staffs: [] }, { status: 500 });
  }
}
