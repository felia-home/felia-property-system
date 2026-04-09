import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("doc_type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    // ファイル保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "uploads", "contracts");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
    await writeFile(filePath, buffer);

    // PDFの場合はAIで解析
    let extractedData: Record<string, unknown> = {};
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const base64 = buffer.toString("base64");

      const prompt = docType === "前契約書"
        ? `この不動産売買契約書・重要事項説明書から以下の情報を抽出してください。
見つからない項目はnullにしてください。
必ずJSONのみで返してください（説明文不要）：
{
  "property_address": "物件所在地（登記記録上の住所）",
  "property_area_land": "土地面積（㎡、数値のみ）",
  "property_area_build": "建物面積（㎡、数値のみ）",
  "property_structure": "構造（木造・鉄骨造・RC造など）",
  "property_built_year": "建築年（西暦）",
  "seller_name": "売主氏名（前契約の買主＝現在の売主）",
  "seller_address": "売主住所",
  "price": "売買代金（円、数値のみ）",
  "zoning": "用途地域",
  "building_coverage": "建蔽率（%、数値のみ）",
  "floor_area_ratio": "容積率（%、数値のみ）",
  "notes": "特記事項・気づき点（簡潔に）"
}`
        : `この役所資料・公的書類から以下の情報を抽出してください。
見つからない項目はnullにしてください。
必ずJSONのみで返してください（説明文不要）：
{
  "property_address": "物件所在地",
  "zoning": "用途地域",
  "building_coverage": "建蔽率（%、数値のみ）",
  "floor_area_ratio": "容積率（%、数値のみ）",
  "property_area_land": "土地面積（㎡）",
  "notes": "その他重要な記載事項（簡潔に）"
}`;

      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        extractedData = JSON.parse(clean);
      } catch {
        extractedData = { notes: text };
      }
    }

    return NextResponse.json({
      success: true,
      file_path: filePath,
      file_name: file.name,
      extracted: extractedData,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
