import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        property_type: true,
        city: true,
        address: true,
        price: true,
        building_name: true,
        building_year: true,
        building_month: true,
        total_units: true,
        floors_total: true,
        management_company: true,
        management_type: true,
        repair_reserve: true,
        management_fee: true,
        structure: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const isMansion = property.property_type === "MANSION" || property.property_type === "NEW_MANSION";

    const searchQuery = [
      property.building_name ?? "",
      property.city ?? "",
      property.address ?? "",
      isMansion ? "マンション 管理会社 修繕積立金 総戸数" : "",
    ].filter(Boolean).join(" ");

    const client = new Anthropic();

    const fieldDesc = isMansion
      ? `収集したい情報:
- building_name: マンション名（正式名称）
- building_year: 築年（西暦4桁整数）
- building_month: 築月（1〜12の整数）
- total_units: 総戸数（整数）
- floors_total: 総階数（整数）
- management_company: 管理会社名
- management_type: 管理形態（全部委託/一部委託/自主管理）
- repair_reserve: 修繕積立金（月額・円・整数）
- management_fee: 管理費（月額・円・整数）
- structure: 構造（RC造/SRC造など）`
      : `収集したい情報:
- building_year: 築年（西暦4桁整数）
- building_month: 築月（1〜12の整数）
- structure: 構造（木造/鉄骨造/RC造など）
- floors_total: 地上階数（整数）`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [
        {
          role: "user",
          content: `以下の物件について、SUUMO・HOME'S・マンションノート等で情報を検索し、
見つかった情報をJSONで返してください。

検索キーワード: ${searchQuery}

${fieldDesc}

情報が見つからない場合はnullにしてください。
複数のソースで情報が異なる場合は最も信頼性の高いものを採用してください。

必ずJSON形式のみで返答してください（説明文不要）:
{
  ${isMansion ? `"building_name": "...",
  "building_year": 2010,
  "building_month": 3,
  "total_units": 120,
  "floors_total": 15,
  "management_company": "...",
  "management_type": "全部委託",
  "repair_reserve": 15000,
  "management_fee": 12000,
  "structure": "RC造",` : `"building_year": 1998,
  "building_month": 3,
  "structure": "木造",
  "floors_total": 2,`}
  "sources": ["取得元URL1", "取得元URL2"]
}`,
        },
      ],
    });

    let resultText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        resultText += block.text;
      }
    }

    let enriched: Record<string, unknown> = {};
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enriched = JSON.parse(jsonMatch[0]);
      }
    } catch {
      enriched = {};
    }

    return NextResponse.json({
      current: property,
      enriched,
      query: searchQuery,
      is_mansion: isMansion,
    });
  } catch (error) {
    console.error("web-enrich error:", error);
    return NextResponse.json({ error: "Web検索に失敗しました" }, { status: 500 });
  }
}
