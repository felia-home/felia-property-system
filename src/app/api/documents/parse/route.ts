import { NextRequest, NextResponse } from "next/server";
import { parseDocument, SourceType } from "@/agents/document-parser";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

// POST /api/documents/parse
// multipart/form-data: file フィールドにPDF or 画像
export async function POST(request: NextRequest) {
  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが指定されていません" },
        { status: 400 }
      );
    }

    const fileName = (file as File).name;
    const ext = path.extname(fileName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "PDF・JPG・PNG形式のみ対応しています" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（20MB上限）
    const fileSize = (file as File).size;
    if (fileSize > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズは20MB以下にしてください" },
        { status: 400 }
      );
    }

    // 一時ファイルに保存
    const bytes = await (file as File).arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = path.join(os.tmpdir(), `felia-parse-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    fs.writeFileSync(tempPath, buffer);

    const sourceType: SourceType = ext === ".pdf" ? "pdf" : "image";

    const result = await parseDocument({
      url: tempPath,
      type: sourceType,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "解析に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/documents/parse error:", error);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました" },
      { status: 500 }
    );
  } finally {
    // 一時ファイルを必ず削除
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }
}
