import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { randomBytes } from "crypto";
import { resizeAndConvertToWebP } from "@/lib/image-resize";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPEG・PNG・WebP・GIF のみアップロード可能です" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // GIF以外はリサイズ・WebP変換
    let uploadBuffer: Buffer;
    let uploadExt: string;
    let uploadMime: string;

    if (file.type === "image/gif") {
      // GIFはそのまま（アニメーション維持）
      uploadBuffer = originalBuffer;
      uploadExt = "gif";
      uploadMime = "image/gif";
    } else {
      const { buffer, ext } = await resizeAndConvertToWebP(originalBuffer, folder);
      uploadBuffer = buffer;
      uploadExt = ext;
      uploadMime = "image/webp";
    }

    const uniqueName = `${randomBytes(16).toString("hex")}.${uploadExt}`;
    const key = `${folder}/${uniqueName}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: uploadBuffer,
        ContentType: uploadMime,
        CacheControl: "public, max-age=31536000",
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ success: true, url: publicUrl, key });
  } catch (error) {
    console.error("アップロードエラー:", error);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
