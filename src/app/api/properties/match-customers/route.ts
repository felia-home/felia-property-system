import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface PropertyInfo {
  price_man?:     number;
  areas?:         string[];
  property_type?: string;
  rooms?:         string;
  station_line?:  string;
  station_name?:  string;
  walk_min?:      number;
  features?:      string[];
}

// POST /api/properties/match-customers
// 受け取った販売図面PDF（複数可）をAIで解析し、希望条件にマッチする顧客リストを返す
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
  }

  const client = new Anthropic();
  const extractedInfoList: string[] = [];

  for (const file of files) {
    if (file.type !== "application/pdf") continue;
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const response = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: `不動産の販売図面です。以下をJSON形式で返してください:
{
  "price_man": 価格（万円・数値のみ）,
  "areas": ["区名"],
  "property_type": "MANSION|NEW_MANSION|USED_HOUSE|NEW_HOUSE|LAND",
  "rooms": "間取り（例: 3LDK）",
  "station_line": "沿線名",
  "station_name": "最寄駅",
  "walk_min": 徒歩分数（数値）,
  "features": ["特徴キーワード"]
}
JSONのみ返してください。`,
            },
          ],
        }],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
      extractedInfoList.push(text);
    } catch (e) {
      console.error("[match] PDF parse error:", e);
    }
  }

  // 解析結果をマージ
  let propertyInfo: PropertyInfo = {};
  for (const text of extractedInfoList) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as PropertyInfo;
        propertyInfo = { ...propertyInfo, ...parsed };
      }
    } catch { /* ignore */ }
  }

  const priceMan = propertyInfo.price_man;

  // 顧客マッチング（候補絞り込み）
  const customers = await prisma.customer.findMany({
    where: {
      is_deleted: false,
      status: { notIn: ["CLOSED", "LOST"] },
      ...(priceMan ? {
        OR: [
          { desired_budget_max: { gte: priceMan * 0.95 } },
          { desired_budget_max: null },
        ],
      } : {}),
    },
    select: {
      id:                    true,
      name:                  true,
      email:                 true,
      status:                true,
      desired_budget_min:    true,
      desired_budget_max:    true,
      desired_areas:         true,
      desired_rooms:         true,
      desired_property_type: true,
      desired_stations:      true,
      last_contact_at:       true,
      assigned_staff:        { select: { id: true, name: true } },
    },
    take: 200,
  });

  // スコアリング
  const scored = customers.map(c => {
    let score = 0;
    if (propertyInfo.areas?.some(a => c.desired_areas.includes(a))) score += 30;
    if (propertyInfo.property_type && c.desired_property_type.includes(propertyInfo.property_type)) score += 25;
    if (propertyInfo.rooms && c.desired_rooms.some(r => propertyInfo.rooms!.includes(r.replace("以上", "")))) score += 20;
    if (priceMan) {
      const inBudget = (!c.desired_budget_max || c.desired_budget_max >= priceMan) &&
                       (!c.desired_budget_min || c.desired_budget_min <= priceMan);
      if (inBudget) score += 25;
    }
    return { ...c, assigned: c.assigned_staff, score };
  })
  .filter(c => c.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

  return NextResponse.json({
    property_info: propertyInfo,
    customers:     scored,
    total:         scored.length,
  });
}
