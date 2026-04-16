/**
 * Storage helper — ファイルアップロード
 * R2_ACCESS_KEY_ID が設定されていれば Cloudflare R2、なければ public/uploads/ にローカル保存
 */

import * as fs from "fs";
import * as path from "path";

export interface UploadResult {
  url: string;       // 公開URL (/uploads/xxx.jpg or https://s3/...)
  filename: string;  // 保存ファイル名
  file_size: number;
  mime_type: string;
}

// ============================================================
// ローカル保存（public/uploads/）
// ============================================================

function sanitizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase() || ".jpg";
  const base = path.basename(original, ext)
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 40);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}_${ts}_${rand}${ext}`;
}

async function saveLocalFile(
  buffer: Buffer,
  originalName: string,
  subdir: string
): Promise<UploadResult> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = sanitizeFilename(originalName);
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${subdir}/${filename}`,
    filename,
    file_size: buffer.length,
    mime_type: getMimeType(filename),
  };
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
  };
  return map[ext] ?? "application/octet-stream";
}

// ============================================================
// R2 アップロード（R2_ACCESS_KEY_ID が設定されている場合）
// ============================================================

async function saveR2File(
  buffer: Buffer,
  originalName: string,
  subdir: string
): Promise<UploadResult> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } = await import("@/lib/r2");

  const filename = sanitizeFilename(originalName);
  const key = `uploads/${subdir}/${filename}`;
  const mimeType = getMimeType(filename);

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const base = R2_PUBLIC_URL.replace(/\/$/, "");
  const url = `${base}/${key}`;
  return { url, filename, file_size: buffer.length, mime_type: mimeType };
}

// ============================================================
// メイン export
// ============================================================

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  subdir: "properties" | "mansions" | "environment" = "properties"
): Promise<UploadResult> {
  const useR2 =
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_ACCOUNT_ID;

  if (useR2) {
    return saveR2File(buffer, originalName, subdir);
  }
  return saveLocalFile(buffer, originalName, subdir);
}

export async function deleteFile(url: string): Promise<void> {
  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    return;
  }
  // S3 delete — omitted for brevity, add when needed
}
