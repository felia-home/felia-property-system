import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchInquiryEmails } from "@/lib/gmail-client";
import { parseInquiryEmail } from "@/agents/inquiry-parser";
import { assignInquiry } from "@/lib/inquiry-assignment";

export async function POST() {
  try {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      return NextResponse.json({ error: "Gmail API未設定です。設定画面でGmail連携を行ってください。" }, { status: 400 });
    }

    const emails = await fetchInquiryEmails();
    const results = { imported: 0, skipped: 0, errors: 0 };

    for (const email of emails) {
      const existing = await prisma.inquiry.findUnique({
        where: { source_email_id: email.id },
      });
      if (existing) { results.skipped++; continue; }

      try {
        const parsed = await parseInquiryEmail(email);

        let propertyId: string | undefined;
        if (parsed.property_number) {
          const property = await prisma.property.findFirst({
            where: { property_number: parsed.property_number },
          });
          propertyId = property?.id;
        }

        let customerId: string | undefined;
        if (parsed.customer_email) {
          const customer = await prisma.customer.upsert({
            where: { email: parsed.customer_email },
            update: {
              name: parsed.customer_name ?? undefined,
              phone: parsed.customer_tel ?? undefined,
            },
            create: {
              email: parsed.customer_email,
              name: parsed.customer_name ?? "氏名未取得",
              phone: parsed.customer_tel,
            },
          });
          customerId = customer.id;
        }

        const assignment = await assignInquiry("", parsed, propertyId);

        await prisma.inquiry.create({
          data: {
            source: parsed.source,
            source_email_id: email.id,
            received_at: email.date,
            raw_email: email.body.slice(0, 10000),
            property_id: propertyId,
            property_name: parsed.property_name,
            property_number: parsed.property_number,
            inquiry_type: parsed.inquiry_type,
            message: parsed.message,
            visit_hope: parsed.visit_hope,
            document_hope: parsed.document_hope,
            customer_id: customerId,
            customer_name: parsed.customer_name,
            customer_email: parsed.customer_email,
            customer_tel: parsed.customer_tel,
            ai_score: parsed.ai_score,
            ai_notes: parsed.ai_notes,
            priority: parsed.priority,
            assigned_to: assignment?.staffId,
            assigned_at: assignment ? new Date() : null,
            assigned_by: "AI",
            assignment_reason: assignment?.reason,
            status: "NEW",
          },
        });

        results.imported++;
      } catch (err) {
        console.error("反響取込エラー:", err);
        results.errors++;
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("POST /api/inquiries/sync error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
