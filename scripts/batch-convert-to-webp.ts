/**
 * R2既存画像の一括WebP変換スクリプト
 * 実行方法: npx tsx scripts/batch-convert-to-webp.ts
 *
 * 処理内容:
 * 1. DBから全画像URLを収集
 * 2. R2から画像をダウンロード
 * 3. SharpでWebP変換
 * 4. R2に上書き保存（新しいキーで保存）
 * 5. DBのURLを更新
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.local を読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

// 変換をスキップする拡張子
const SKIP_EXTENSIONS = [".webp", ".gif", ".svg"];

interface ConvertResult {
  originalUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
}

/**
 * URLからR2のキーを取得
 */
function urlToKey(url: string): string {
  return url.replace(`${PUBLIC_URL}/`, "");
}

/**
 * 画像をWebPに変換してR2に保存
 */
async function convertAndUpload(
  originalKey: string
): Promise<{ newKey: string; newUrl: string }> {
  // R2から画像をダウンロード
  const getRes = await r2Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: originalKey })
  );

  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = getRes.Body as any;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // WebP変換
  const webpBuffer = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();

  // 新しいキー（拡張子をwebpに変更）
  const baseKey = originalKey.replace(/\.[^/.]+$/, "");
  const newKey = `${baseKey}.webp`;

  // R2にアップロード
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000",
    })
  );

  return {
    newKey,
    newUrl: `${PUBLIC_URL}/${newKey}`,
  };
}

/**
 * DBから全画像URLを収集
 */
async function collectAllImageUrls(): Promise<
  Map<string, { table: string; field: string; id: string; url: string }[]>
> {
  const urlMap = new Map<
    string,
    { table: string; field: string; id: string; url: string }[]
  >();

  const addUrl = (
    url: string | null | undefined,
    table: string,
    field: string,
    id: string
  ) => {
    if (!url || !url.startsWith(PUBLIC_URL)) return;
    if (!urlMap.has(url)) urlMap.set(url, []);
    urlMap.get(url)!.push({ table, field, id, url });
  };

  // property_images
  const propertyImages = await prisma.propertyImage.findMany({
    select: { id: true, url: true },
  });
  propertyImages.forEach((i) => addUrl(i.url, "property_images", "url", i.id));

  // staffs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staffs = await (prisma as any).staff.findMany({
    select: {
      id: true,
      photo_url: true,
      sub_image_url_1: true,
      sub_image_url_2: true,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  staffs.forEach((s: any) => {
    addUrl(s.photo_url, "staffs", "photo_url", s.id);
    addUrl(s.sub_image_url_1, "staffs", "sub_image_url_1", s.id);
    addUrl(s.sub_image_url_2, "staffs", "sub_image_url_2", s.id);
  });

  // hero_banners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heroBanners = await (prisma as any).heroBanner.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heroBanners.forEach((b: any) =>
    addUrl(b.image_url, "hero_banners", "image_url", b.id)
  );

  // search_banners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchBanners = await (prisma as any).searchBanner.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchBanners.forEach((b: any) =>
    addUrl(b.image_url, "search_banners", "image_url", b.id)
  );

  // banners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const banners = await (prisma as any).banner.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  banners.forEach((b: any) =>
    addUrl(b.image_url, "banners", "image_url", b.id)
  );

  // features
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = await (prisma as any).feature.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features.forEach((f: any) =>
    addUrl(f.image_url, "features", "image_url", f.id)
  );

  // area_settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areas = await (prisma as any).areaSetting.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  areas.forEach((a: any) =>
    addUrl(a.image_url, "area_settings", "image_url", a.id)
  );

  // testimonials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testimonials = await (prisma as any).testimonial.findMany({
    select: { id: true, image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testimonials.forEach((t: any) =>
    addUrl(t.image_url, "testimonials", "image_url", t.id)
  );

  // sale_results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saleResults = await (prisma as any).saleResult.findMany({
    select: {
      id: true,
      image_url_1: true,
      image_url_2: true,
      image_url_3: true,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saleResults.forEach((s: any) => {
    addUrl(s.image_url_1, "sale_results", "image_url_1", s.id);
    addUrl(s.image_url_2, "sale_results", "image_url_2", s.id);
    addUrl(s.image_url_3, "sale_results", "image_url_3", s.id);
  });

  // web_flyers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webFlyers = await (prisma as any).webFlyer.findMany({
    select: { id: true, front_image_url: true, back_image_url: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webFlyers.forEach((f: any) => {
    addUrl(f.front_image_url, "web_flyers", "front_image_url", f.id);
    addUrl(f.back_image_url, "web_flyers", "back_image_url", f.id);
  });

  return urlMap;
}

/**
 * DBのURLを更新
 */
async function updateDbUrl(
  table: string,
  field: string,
  id: string,
  newUrl: string
): Promise<void> {
  const updateData = { [field]: newUrl };

  switch (table) {
    case "property_images":
      await prisma.propertyImage.update({ where: { id }, data: updateData });
      break;
    case "staffs":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).staff.update({ where: { id }, data: updateData });
      break;
    case "hero_banners":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).heroBanner.update({
        where: { id },
        data: updateData,
      });
      break;
    case "search_banners":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).searchBanner.update({
        where: { id },
        data: updateData,
      });
      break;
    case "banners":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).banner.update({ where: { id }, data: updateData });
      break;
    case "features":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).feature.update({ where: { id }, data: updateData });
      break;
    case "area_settings":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).areaSetting.update({
        where: { id },
        data: updateData,
      });
      break;
    case "testimonials":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).testimonial.update({
        where: { id },
        data: updateData,
      });
      break;
    case "sale_results":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).saleResult.update({
        where: { id },
        data: updateData,
      });
      break;
    case "web_flyers":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).webFlyer.update({
        where: { id },
        data: updateData,
      });
      break;
    default:
      console.warn(`Unknown table: ${table}`);
  }
}

async function main() {
  console.log("🚀 R2画像一括WebP変換を開始します...\n");

  if (!BUCKET || !PUBLIC_URL || !process.env.R2_ACCESS_KEY_ID) {
    console.error("❌ 環境変数が設定されていません。.env.local を確認してください。");
    console.error("   必要: R2_BUCKET_NAME, R2_PUBLIC_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID");
    process.exit(1);
  }

  // 全画像URL収集
  console.log("📋 DBから画像URLを収集中...");
  const urlMap = await collectAllImageUrls();
  console.log(`✅ ${urlMap.size}件の画像URLを収集しました\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const results: ConvertResult[] = [];

  for (const [url, references] of urlMap) {
    const key = urlToKey(url);
    const ext = path.extname(key).toLowerCase();

    // スキップ対象
    if (SKIP_EXTENSIONS.includes(ext)) {
      console.log(`⏭️  スキップ: ${key} (${ext})`);
      skipCount++;
      results.push({ originalUrl: url, newUrl: url, success: true, skipped: true });
      continue;
    }

    try {
      console.log(`🔄 変換中: ${key}`);
      const { newUrl } = await convertAndUpload(key);

      // DBの全参照を更新
      for (const ref of references) {
        await updateDbUrl(ref.table, ref.field, ref.id, newUrl);
      }

      console.log(`✅ 完了: ${path.basename(key)} → ${path.basename(newUrl)}`);
      successCount++;
      results.push({ originalUrl: url, newUrl, success: true });

      // レート制限対策
      await new Promise((r) => setTimeout(r, 100));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ エラー: ${key} - ${msg}`);
      errorCount++;
      results.push({ originalUrl: url, newUrl: url, success: false, error: msg });
    }
  }

  console.log("\n📊 変換結果:");
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ⏭️  スキップ: ${skipCount}件`);
  console.log(`  ❌ エラー: ${errorCount}件`);

  // 結果をファイルに保存
  const resultPath = path.resolve(process.cwd(), "scripts/batch-convert-result.json");
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 結果を保存: ${resultPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
