import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/anthropic/generate
// Body: { prompt: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { prompt } = await req.json() as { prompt?: string };
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("anthropic generate error:", error);
    return NextResponse.json({ error: "AI生成に失敗しました" }, { status: 500 });
  }
}
