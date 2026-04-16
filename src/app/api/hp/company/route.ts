import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/hp/company — HP向け公開API
export async function GET() {
  try {
    const company = await prisma.companySetting.findFirst({
      orderBy: { created_at: "asc" },
    });

    if (!company) {
      return NextResponse.json({
        company: {
          name: "株式会社フェリアホーム",
          postal_code: null,
          address: "東京都渋谷区幡ヶ谷2-14-7",
          phone: "03-5352-7913",
          fax: null,
          email: null,
          hours: "10:00〜19:00",
          holiday: "水曜日・年末年始",
          license: "東京都知事（X）第XXXXX号",
          access_text: "千駄ヶ谷駅の改札を出て道路沿いに右側へ進みます。最初の信号（国立能楽堂前）を左折します。1車線の通りを直進し、くすりのカメイ様の隣のビル1階となります。",
          lat: 35.6773,
          lng: 139.6858,
        },
      });
    }

    return NextResponse.json({
      company: {
        name: company.name,
        postal_code: company.postal_code,
        address: company.address,
        phone: company.phone,
        fax: company.fax,
        email: company.email,
        hours: company.hours,
        holiday: company.holiday,
        license: company.license,
        access_text: company.access_text,
        lat: company.lat,
        lng: company.lng,
      },
    });
  } catch (error) {
    console.error("company API error:", error);
    return NextResponse.json({ company: null }, { status: 500 });
  }
}
