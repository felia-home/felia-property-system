import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  NEW_HOUSE:   "新築戸建て",
  USED_HOUSE:  "中古戸建て",
  MANSION:     "中古マンション",
  NEW_MANSION: "新築マンション",
  LAND:        "土地",
};

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
        city: true,
        town: true,
        address: true,
        property_type: true,
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

    const propertyTypeStr = TYPE_LABEL[property.property_type ?? ""] ?? "";
    const priceStr = property.price ? `${property.price}万円` : "";
    const fullAddress = [property.city, property.town, property.address].filter(Boolean).join("");
    const buildingNameStr = property.building_name ?? "";

    // マンション名があれば最優先、なければ住所で検索
    const searchQuery = [
      buildingNameStr || fullAddress,
      propertyTypeStr,
      priceStr,
    ].filter(Boolean).join(" ");

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [
        {
          role: "user",
          content: `以下の不動産物件について、SUUMO・HOME'S・マンションノート・不動産ジャパン等で
詳細情報を検索し、見つかった情報をJSONで返してください。

物件情報:
- 住所: ${fullAddress}
- 物件種別: ${propertyTypeStr}
- 価格: ${priceStr}
${buildingNameStr ? `- マンション名: ${buildingNameStr}` : ""}

検索キーワード: ${searchQuery}

収集したい情報（物件種別に応じて関連するものを収集）:
- building_name: マンション・建物名（正式名称）
- building_year: 築年（西暦4桁）
- building_month: 築月
- total_units: 総戸数
- floors_total: 総階数
- management_company: 管理会社名
- management_type: 管理形態（全部委託/一部委託/自主管理）
- repair_reserve: 修繕積立金（月額・円の数値のみ）
- management_fee: 管理費（月額・円の数値のみ）
- structure: 構造（RC造/SRC造/木造など）

情報が見つからない場合はnullにしてください。
必ずJSON形式のみで返答（前置き・説明文不要）:
{
  "building_name": null,
  "building_year": null,
  "building_month": null,
  "total_units": null,
  "floors_total": null,
  "management_company": null,
  "management_type": null,
  "repair_reserve": null,
  "management_fee": null,
  "structure": null,
  "sources": []
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
