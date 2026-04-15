import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const flyer = await prisma.webFlyer.findUnique({ where: { id: params.id } });
  if (!flyer) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (!flyer.front_image_url || !flyer.back_image_url) {
    return NextResponse.json(
      { error: "表と裏の画像を両方設定してください" },
      { status: 400 }
    );
  }

  try {
    const { jsPDF } = await import("jspdf");

    const frontRes = await fetch(flyer.front_image_url);
    const frontBuffer = await frontRes.arrayBuffer();
    const frontBase64 = Buffer.from(frontBuffer).toString("base64");
    const frontMime = frontRes.headers.get("content-type") || "image/jpeg";

    const backRes = await fetch(flyer.back_image_url);
    const backBuffer = await backRes.arrayBuffer();
    const backBase64 = Buffer.from(backBuffer).toString("base64");
    const backMime = backRes.headers.get("content-type") || "image/jpeg";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.addImage(`data:${frontMime};base64,${frontBase64}`, "JPEG", 0, 0, 210, 297);
    doc.addPage();
    doc.addImage(`data:${backMime};base64,${backBase64}`, "JPEG", 0, 0, 210, 297);

    const pdfBase64 = doc.output("datauristring");

    const { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } = await import("@/lib/r2");
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { randomBytes } = await import("crypto");

    const pdfKey = `flyers/pdf/${randomBytes(16).toString("hex")}.pdf`;
    const pdfBuffer = Buffer.from(pdfBase64.split(",")[1], "base64");

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }));

    const pdfUrl = `${R2_PUBLIC_URL}/${pdfKey}`;

    await prisma.webFlyer.update({
      where: { id: params.id },
      data: { pdf_url: pdfUrl },
    });

    return NextResponse.json({ success: true, pdf_url: pdfUrl });
  } catch (error) {
    console.error("PDF生成エラー:", error);
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 });
  }
}
