/**
 * ImageAnalyzerAgent
 * 物件写真をAI分析してキャプション・PR文・部屋種別を自動生成
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

export type RoomType =
  | "LIVING"
  | "KITCHEN"
  | "BEDROOM"
  | "BATHROOM"
  | "TOILET"
  | "ENTRANCE"
  | "EXTERIOR"
  | "FLOOR_PLAN"
  | "BALCONY"
  | "GARDEN"
  | "PARKING"
  | "OTHER";

export interface ImageAnalysisResult {
  room_type: RoomType;
  ai_caption: string;     // 説明的キャプション（〇帖LDK 南向き等）
  ai_pr_text: string;     // 購買意欲を高めるPR文（〜100文字）
  ai_confidence: number;  // 0.0〜1.0
}

// ============================================================
// 画像読み込み（ローカルファイル or URL）
// ============================================================

async function loadImageAsBase64(
  urlOrPath: string
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }> {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const res = await fetch(urlOrPath);
    const buf = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    return {
      data: Buffer.from(buf).toString("base64"),
      mediaType: ct.includes("png") ? "image/png"
        : ct.includes("webp") ? "image/webp"
        : ct.includes("gif") ? "image/gif"
        : "image/jpeg",
    };
  }

  // ローカルパス（/uploads/... → public/uploads/...）
  const localPath = urlOrPath.startsWith("/uploads/")
    ? path.join(process.cwd(), "public", urlOrPath)
    : urlOrPath;

  const buf = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  return {
    data: buf.toString("base64"),
    mediaType: ext === ".png" ? "image/png"
      : ext === ".webp" ? "image/webp"
      : ext === ".gif" ? "image/gif"
      : "image/jpeg",
  };
}

// ============================================================
// メイン分析関数
// ============================================================

export async function analyzePropertyImage(
  imageUrl: string,
  propertyContext?: {
    property_type?: string;
    rooms?: string;
    area_build_m2?: number;
  }
): Promise<ImageAnalysisResult> {
  const { data, mediaType } = await loadImageAsBase64(imageUrl);

  const contextText = propertyContext
    ? `物件種別: ${propertyContext.property_type ?? "不明"}, 間取り: ${propertyContext.rooms ?? "不明"}, 建物面積: ${propertyContext.area_build_m2 ?? "不明"}㎡`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          {
            type: "text",
            text: `あなたは不動産写真の専門家です。この物件写真を分析してください。
${contextText ? `\n物件情報: ${contextText}\n` : ""}
以下のJSON形式のみで返答してください（他のテキスト不要）:
{
  "room_type": "LIVING|KITCHEN|BEDROOM|BATHROOM|TOILET|ENTRANCE|EXTERIOR|FLOOR_PLAN|BALCONY|GARDEN|PARKING|OTHER のいずれか",
  "ai_caption": "写真の説明（例：南向き19帖LDK、フローリング、大型窓）〜50文字",
  "ai_pr_text": "購買意欲を高めるPR文（例：陽光差し込む開放的なLDK。家族が自然と集まる、くつろぎの空間。）〜80文字",
  "ai_confidence": 0.0〜1.0の数値
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      room_type: (parsed.room_type as RoomType) ?? "OTHER",
      ai_caption: parsed.ai_caption ?? "",
      ai_pr_text: parsed.ai_pr_text ?? "",
      ai_confidence: typeof parsed.ai_confidence === "number" ? parsed.ai_confidence : 0.7,
    };
  } catch {
    return {
      room_type: "OTHER",
      ai_caption: "",
      ai_pr_text: "",
      ai_confidence: 0,
    };
  }
}

// ============================================================
// 環境写真分析
// ============================================================

export async function analyzeEnvironmentImage(
  imageUrl: string
): Promise<{ facility_type: string; ai_caption: string }> {
  const { data, mediaType } = await loadImageAsBase64(imageUrl);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          {
            type: "text",
            text: `この周辺環境写真を分析してください。JSONのみ返答:
{
  "facility_type": "SCHOOL|SUPERMARKET|PARK|STATION|HOSPITAL|CONVENIENCE_STORE|OTHER のいずれか",
  "ai_caption": "写真の説明（〜40文字）"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { facility_type: "OTHER", ai_caption: "" };
  }
}
