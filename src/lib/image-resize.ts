import sharp from "sharp";

// フォルダ別リサイズ設定
const RESIZE_CONFIGS: Record<string, { maxWidth: number; quality: number }> = {
  "hero-banners":   { maxWidth: 1920, quality: 80 },
  "banners":        { maxWidth: 1920, quality: 80 },
  "search-banners": { maxWidth: 1920, quality: 80 },
  "flyers":         { maxWidth: 800,  quality: 85 },
  "staff":          { maxWidth: 1200, quality: 85 },
  "properties":     { maxWidth: 1200, quality: 80 },
  "areas":          { maxWidth: 800,  quality: 80 },
  "features":       { maxWidth: 1200, quality: 80 },
  "testimonials":   { maxWidth: 1200, quality: 80 },
  "sale-results":   { maxWidth: 1200, quality: 80 },
  "general":        { maxWidth: 1200, quality: 80 },
};

const DEFAULT_CONFIG = { maxWidth: 1200, quality: 80 };

export async function resizeAndConvertToWebP(
  buffer: Buffer,
  folder: string
): Promise<{ buffer: Buffer; ext: string }> {
  const config = RESIZE_CONFIGS[folder] ?? DEFAULT_CONFIG;

  try {
    const resized = await sharp(buffer)
      .resize({
        width: config.maxWidth,
        withoutEnlargement: true, // 元画像より大きくしない
        fit: "inside",
      })
      .webp({ quality: config.quality })
      .toBuffer();

    return { buffer: resized, ext: "webp" };
  } catch (error) {
    console.error("[ImageResize] Error:", error);
    // リサイズ失敗時は元のバッファをそのまま返す
    return { buffer, ext: "webp" };
  }
}

/**
 * 元のファイル名の拡張子を .webp に変更
 */
export function toWebPFilename(originalName: string): string {
  const base = originalName.replace(/\.[^/.]+$/, "");
  return `${base}.webp`;
}
