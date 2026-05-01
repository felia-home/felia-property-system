import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { randomBytes } from "crypto";

/**
 * 外部URLから画像をダウンロードしてR2にアップロードする
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

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000) return null; // 1KB未満はスキップ（404 placeholder などを除外）

    const ext = contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : contentType.includes("gif")  ? "gif"
      : "jpg";

    const filename = `${folder}/${randomBytes(8).toString("hex")}.${ext}`;

    await r2Client.send(new PutObjectCommand({
      Bucket:      R2_BUCKET_NAME,
      Key:         filename,
      Body:        Buffer.from(buffer),
      ContentType: contentType,
    }));

    return `${R2_PUBLIC_URL}/${filename}`;
  } catch (e) {
    console.error("[import-image] downloadAndUploadToR2 failed:", sourceUrl, e instanceof Error ? e.message : e);
    return null;
  }
}
