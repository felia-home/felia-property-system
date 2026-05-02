import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * 外部URLから画像をダウンロードしてR2にアップロードする
 * sharp での変換は行わず、バイト列をそのまま格納する
 * @returns R2のpublic URL、失敗時はnull
 */
export async function downloadAndUploadToR2(
  sourceUrl: string,
  folder: string = "imported"
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "FeliaPropertySystem/1.0" },
    });

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000) return null; // 1KB未満は404 placeholderなどとみなしスキップ

    // Content-Typeを正規化: "image/jpeg; charset=utf-8" → "image/jpeg"
    const rawContentType = res.headers.get("content-type") ?? "image/jpeg";
    const contentType = rawContentType.split(";")[0].trim().toLowerCase();

    // 対応フォーマット外（HEIF/AVIF など）はスキップせずJPEG扱いでフォールバック
    // ※旧システムは Content-Type が壊れているケースがあるため
    if (!ALLOWED_TYPES.has(contentType)) {
      console.log(`[import-image] unsupported content-type: ${contentType} for ${sourceUrl} — fallback to image/jpeg`);
    }

    const ext = contentType.includes("png")  ? "png"
              : contentType.includes("webp") ? "webp"
              : contentType.includes("gif")  ? "gif"
              : "jpg";

    const filename = `${folder}/${randomBytes(8).toString("hex")}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket:      R2_BUCKET_NAME,
      Key:         filename,
      Body:        Buffer.from(buffer),
      ContentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    }));

    return `${R2_PUBLIC_URL}/${filename}`;
  } catch (e) {
    console.error("[import-image] downloadAndUploadToR2 failed:", sourceUrl, e instanceof Error ? e.message : e);
    return null;
  }
}
