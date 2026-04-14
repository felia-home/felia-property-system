import { Resend } from "resend";

// 呼び出し時に初期化（ビルド時の未設定エラーを回避）
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY が設定されていません");
  return new Resend(key);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.MAIL_FROM ?? "noreply@felia-home.co.jp";
  return getResend().emails.send({
    from: `フェリアホーム <${from}>`,
    to,
    subject,
    html,
  });
}

/**
 * テンプレートの {{変数名}} を実際の値に置換する
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, value ?? "");
  }, template);
}
