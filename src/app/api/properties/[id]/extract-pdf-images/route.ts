import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ExtractedImage {
  index: number;
  type: string;
  type_ja: string;
  description: string;
  page: number;
  quality: string;
  recommended: boolean;
}

// POST /api/properties/[id]/extract-pdf-images
// Body: { pdf_url: string }
export async function POST(
  req: NextRequest,
  _ctx: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pdf_url } = await req.json() as { pdf_url?: string };
    if (!pdf_url) return NextResponse.json({ error: "pdf_url is required" }, { status: 400 });

    const pdfRes = await fetch(pdf_url);
    if (!pdfRes.ok) return NextResponse.json({ error: "PDF取得失敗" }, { status: 400 });
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `このPDFに含まれる全ての画像（間取り図・外観写真・内観写真・地図等）を分析してください。

各画像について以下をJSON配列で返してください：
[
  {
    "index": 1,
    "type": "floorplan" | "exterior" | "interior" | "map" | "other",
    "type_ja": "間取り図" | "外観写真" | "内観写真" | "地図" | "その他",
    "description": "画像の説明（何が写っているか）",
    "page": ページ番号,
    "quality": "high" | "medium" | "low",
    "recommended": true | false
  }
]

JSONのみを返してください。説明文は不要です。画像が見つからない場合は [] を返してください。`,
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    let images: ExtractedImage[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) images = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("JSON parse error:", e, "text:", text);
      images = [];
    }

    return NextResponse.json({
      ok:    true,
      pdf_url,
      images,
      total: images.length,
    });
  } catch (error) {
    console.error("extract-pdf-images error:", error);
    return NextResponse.json({ error: "PDF解析に失敗しました" }, { status: 500 });
  }
}
