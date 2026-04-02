import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://admin.felia-home.co.jp/api/gmail/callback"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

export const gmail = google.gmail({ version: "v1", auth: oauth2Client });

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: Date;
  body: string;
}

export async function fetchInquiryEmails(since?: Date): Promise<EmailMessage[]> {
  const query = [
    "is:unread",
    "label:inbox",
    `(from:suumo.jp OR from:athome.co.jp OR from:homes.co.jp OR from:yahoo.co.jp OR subject:お問い合わせ OR subject:資料請求 OR subject:内見予約 OR subject:反響)`,
    since ? `after:${Math.floor(since.getTime() / 1000)}` : "",
  ].filter(Boolean).join(" ");

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
  });

  const messages = res.data.messages ?? [];
  const results: EmailMessage[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const headers = detail.data.payload?.headers ?? [];
    const subject = headers.find(h => h.name === "Subject")?.value ?? "";
    const from = headers.find(h => h.name === "From")?.value ?? "";
    const date = headers.find(h => h.name === "Date")?.value ?? "";
    const body = extractEmailBody(detail.data.payload);

    results.push({
      id: msg.id,
      subject,
      from,
      date: new Date(date),
      body,
    });
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEmailBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      const result = extractEmailBody(part);
      if (result) return result;
    }
  }
  return "";
}
