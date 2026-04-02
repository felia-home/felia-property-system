import Anthropic from "@anthropic-ai/sdk";
import { EmailMessage } from "@/lib/gmail-client";

export interface ParsedInquiry {
  source: string;
  inquiry_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_tel: string | null;
  customer_address: string | null;
  property_name: string | null;
  property_number: string | null;
  message: string | null;
  visit_hope: boolean;
  document_hope: boolean;
  priority: string;
  ai_score: number;
  ai_notes: string;
  assignment_suggestion: string | null;
}

export async function parseInquiryEmail(email: EmailMessage): Promise<ParsedInquiry> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `あなたは不動産会社の反響メール解析AIです。以下のメールを解析して物件問い合わせ情報をJSONで返してください。

## メール情報
差出人: ${email.from}
件名: ${email.subject}
受信日時: ${email.date.toISOString()}
本文:
${email.body}

## 出力JSON形式
{
  "source": "SUUMO | ATHOME | YAHOO | HOMES | HP | OTHER",
  "inquiry_type": "PROPERTY | ASSESSMENT | GENERAL",
  "customer_name": "顧客名（null可）",
  "customer_email": "メールアドレス（null可）",
  "customer_tel": "電話番号（null可）",
  "customer_address": "住所（null可）",
  "property_name": "問い合わせ物件名（null可）",
  "property_number": "物件番号（null可）",
  "message": "お客様のメッセージ本文",
  "visit_hope": true/false,
  "document_hope": true/false,
  "priority": "HIGH | NORMAL | LOW",
  "ai_score": 0から100の整数,
  "ai_notes": "AIによる顧客分析",
  "assignment_suggestion": "担当者選定のポイント"
}

JSONのみ返答（前置き不要）`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim()) as ParsedInquiry;
  } catch {
    return {
      source: "OTHER",
      inquiry_type: "GENERAL",
      customer_name: null,
      customer_email: null,
      customer_tel: null,
      customer_address: null,
      property_name: null,
      property_number: null,
      message: email.body.slice(0, 500),
      visit_hope: false,
      document_hope: false,
      priority: "NORMAL",
      ai_score: 30,
      ai_notes: "解析に失敗しました",
      assignment_suggestion: null,
    };
  }
}
