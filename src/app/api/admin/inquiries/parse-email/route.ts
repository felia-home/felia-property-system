import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/admin/inquiries/parse-email
// body: { raw_email: string, source?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { raw_email, source } = await req.json() as {
    raw_email?: string;
    source?:    string;
  };
  if (!raw_email) {
    return NextResponse.json({ error: "raw_email required" }, { status: 400 });
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `以下のポータルサイト（${source ?? "SUUMO/athome"}）からの反響メールを解析してください。

メール本文:
${raw_email}

以下のJSON形式で返してください:
{
  "customer_name": "顧客名",
  "customer_email": "メールアドレス",
  "customer_tel": "電話番号",
  "inquiry_type": "PROPERTY|ASSESSMENT|GENERAL",
  "property_name": "物件名",
  "property_number": "物件番号（あれば）",
  "message": "問い合わせ内容",
  "visit_hope": true/false,
  "document_hope": true/false
}

JSONのみ返してください。`,
    }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  let parsed: Record<string, unknown> = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const asString = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  const asBool = (v: unknown): boolean =>
    typeof v === "boolean" ? v : v === "true";

  const inquiry = await prisma.inquiry.create({
    data: {
      source:          source ?? "OTHER",
      raw_email:       raw_email,
      received_at:     new Date(),
      customer_name:   asString(parsed.customer_name),
      customer_email:  asString(parsed.customer_email),
      customer_tel:    asString(parsed.customer_tel),
      inquiry_type:    asString(parsed.inquiry_type) ?? "PROPERTY",
      property_name:   asString(parsed.property_name),
      property_number: asString(parsed.property_number),
      message:         asString(parsed.message),
      visit_hope:      asBool(parsed.visit_hope),
      document_hope:   asBool(parsed.document_hope),
      status:          "NEW",
    },
  });

  return NextResponse.json({ ok: true, inquiry, parsed });
}
