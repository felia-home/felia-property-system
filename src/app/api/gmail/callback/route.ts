import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "認証コードがありません" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://admin.felia-home.co.jp/api/gmail/callback"
  );

  const { tokens } = await oauth2Client.getToken(code);

  // refresh_tokenをログに出力（本番では.envに手動設定が必要）
  console.log("Gmail refresh_token:", tokens.refresh_token);

  return new NextResponse(`
    <html><body style="font-family:sans-serif;padding:40px">
      <h2>Gmail認証完了</h2>
      <p>以下のrefresh_tokenを <code>.env</code> の <code>GMAIL_REFRESH_TOKEN</code> に設定してください：</p>
      <pre style="background:#f5f5f5;padding:16px;border-radius:8px;word-break:break-all">${tokens.refresh_token ?? "（refresh_tokenが取得できませんでした。もう一度試してください）"}</pre>
      <p><a href="/admin/settings">設定画面に戻る</a></p>
    </body></html>
  `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
