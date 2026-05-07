import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { randomBytes } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// GET /api/customers/[id]/proposals
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await prisma.customerProposal.findMany({
    where: { customer_id: params.id },
    include: {
      staff:    { select: { id: true, name: true } },
      property: { select: { id: true, building_name: true, city: true, price: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ proposals });
}

// POST /api/customers/[id]/proposals
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file       = formData.get("file") as File | null;
  const titleRaw   = formData.get("title");
  const noteRaw    = formData.get("note");
  const propIdRaw  = formData.get("property_id");
  const title      = typeof titleRaw  === "string" ? titleRaw  : "";
  const note       = typeof noteRaw   === "string" ? noteRaw   : "";
  const propertyId = typeof propIdRaw === "string" && propIdRaw ? propIdRaw : null;
  const staffId    = session.user?.staffId ?? null;

  let pdfUrl: string | null = null;
  let extractedText: string | null = null;

  if (file && file.type === "application/pdf") {
    const buffer   = await file.arrayBuffer();
    const filename = `proposals/${randomBytes(8).toString("hex")}.pdf`;

    await r2Client.send(new PutObjectCommand({
      Bucket:      R2_BUCKET_NAME,
      Key:         filename,
      Body:        Buffer.from(buffer),
      ContentType: "application/pdf",
    }));
    pdfUrl = `${R2_PUBLIC_URL}/${filename}`;

    // Claude APIでPDF内容を要約
    try {
      const base64 = Buffer.from(buffer).toString("base64");
      const client = new Anthropic();
      const response = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: "不動産の販売図面PDFです。物件名・価格・面積・所在地・交通・間取り・築年月・特徴を簡潔にまとめてください。200字以内でお願いします。",
            },
          ],
        }],
      });
      extractedText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
    } catch (e) {
      console.error("[proposal] PDF extract error:", e);
    }
  }

  const proposal = await prisma.customerProposal.create({
    data: {
      customer_id:    params.id,
      staff_id:       staffId,
      property_id:    propertyId,
      pdf_url:        pdfUrl,
      extracted_text: extractedText,
      title:          title || file?.name || "提案書類",
      note:           note,
      sent_at:        new Date(),
    },
    include: {
      staff:    { select: { id: true, name: true } },
      property: { select: { id: true, building_name: true, city: true } },
    },
  });

  // 活動履歴にも記録
  await prisma.customerActivity.create({
    data: {
      customer_id:  params.id,
      staff_id:     staffId,
      type:         "EMAIL",
      phase:        "SALES",
      direction:    "OUTBOUND",
      content:      `物件提案: ${proposal.title}${extractedText ? ` - ${extractedText.slice(0, 50)}` : ""}`,
      property_id:  propertyId,
      proposal_ids: [proposal.id],
    },
  });

  await prisma.customer.update({
    where: { id: params.id },
    data:  { last_contact_at: new Date() },
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
