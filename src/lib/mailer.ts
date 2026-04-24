import { sendEmail } from "@/lib/email";

/**
 * 汎用メール送信（text / html 両対応）
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const htmlBody =
    html ??
    `<pre style="font-family:sans-serif;white-space:pre-wrap;">${text ?? ""}</pre>`;
  return sendEmail({ to, subject, html: htmlBody });
}

/**
 * 会員向け物件通知メールを送信する
 * 既存の Resend ベースの sendEmail をラップ
 */
export async function sendMemberNotification({
  to,
  memberName,
  subject,
  properties,
}: {
  to: string;
  memberName: string;
  subject: string;
  properties: {
    id: string;
    title: string | null;
    catch_copy: string | null;
    price: number;
    city: string;
    town: string | null;
    rooms: string | null;
    area_build_m2: number | null;
    area_land_m2: number | null;
    station_name1: string | null;
    station_walk1: number | null;
    imageUrl?: string | null;
  }[];
}) {
  const formatPrice = (p: number) =>
    p >= 10000
      ? `${(p / 10000).toFixed(p % 10000 === 0 ? 0 : 1)}億円`
      : `${p.toLocaleString()}万円`;

  const propertyHtml = properties
    .map(
      (p) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;background:#fff;">
      ${
        p.imageUrl
          ? `<img src="${p.imageUrl}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:6px;margin-bottom:10px;">`
          : ""
      }
      <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">${p.city}${p.town ?? ""}</div>
      <div style="font-size:16px;font-weight:700;color:#111;margin-bottom:4px;">${
        p.catch_copy || p.title || "物件情報"
      }</div>
      <div style="font-size:20px;font-weight:700;color:#16a34a;margin-bottom:8px;">${formatPrice(p.price)}</div>
      <div style="font-size:12px;color:#374151;">
        ${p.rooms ? `間取り: ${p.rooms}　` : ""}
        ${p.area_build_m2 ? `建物: ${p.area_build_m2}㎡　` : ""}
        ${p.area_land_m2 ? `土地: ${p.area_land_m2}㎡　` : ""}
        ${p.station_name1 ? `${p.station_name1}駅 徒歩${p.station_walk1 ?? "-"}分` : ""}
      </div>
      <a href="https://felia-home.co.jp/properties/${p.id}"
         style="display:inline-block;margin-top:10px;padding:8px 18px;background:#16a34a;color:#fff;border-radius:6px;font-size:13px;text-decoration:none;font-weight:600;">
        詳細を見る
      </a>
    </div>`
    )
    .join("\n");

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#16a34a;">Felia Home</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px;">物件新着・更新通知</div>
    </div>

    <div style="background:#fff;border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#374151;">${memberName} 様</p>
      <p style="margin:0;color:#374151;">
        ご登録の検索条件に一致する物件が <strong>${properties.length}件</strong> あります。
      </p>
    </div>

    ${propertyHtml}

    <div style="text-align:center;margin-top:24px;">
      <a href="https://felia-home.co.jp/members/search"
         style="display:inline-block;padding:10px 24px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#374151;text-decoration:none;">
        すべての物件を見る
      </a>
    </div>

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
      <p style="margin:0 0 4px;">本メールは会員登録時に設定された通知設定に基づき送信しています。</p>
      <p style="margin:0;">
        <a href="https://felia-home.co.jp/members/settings/notifications" style="color:#9ca3af;">通知設定の変更はこちら</a>
      </p>
      <p style="margin:8px 0 0;color:#c4b8a0;">フェリアホーム株式会社</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}
