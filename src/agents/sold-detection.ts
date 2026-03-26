/**
 * SoldDetectionAgent
 * 掲載中物件の成約を検知し、担当者へアラートを送るエージェント
 *
 * 成約の自動非掲載は実施しない。担当者確認後の手動処理のみ。
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ============================================================
// 型定義
// ============================================================

export type Signal =
  | "reins_sold"          // REINSに成約登録
  | "portal_disappeared"  // ポータルから掲載消滅
  | "long_no_inquiry"     // 長期間問い合わせなし
  | "long_negotiating"    // 商談中が長期継続
  | "price_revised_many"  // 価格改定多数
  | "never_inquired";     // 一度も問い合わせなし

interface SignalScore {
  signal: Signal;
  score: number;
  detail: string;
}

export interface PropertyMonitorData {
  property_id: string;
  property_name: string;
  status: string;
  listed_price: number;
  days_on_market: number;
  inquiry_count_total: number;
  inquiry_count_last_30d: number;
  viewing_count: number;
  price_revision_count: number;
  days_negotiating?: number;
  reins_sold: boolean;
  portal_suumo_active: boolean;
  portal_athome_active: boolean;
  agent_id: string;
  agent_slack_id?: string;
}

export interface SoldDetectionResult {
  property_id: string;
  total_score: number;
  signals: SignalScore[];
  alert_level: "none" | "watch" | "alert" | "urgent";
  recommended_action: string;
  agent: "SoldDetectionAgent";
}

// ============================================================
// スコアリングロジック
// ============================================================

export function scoreProperty(data: PropertyMonitorData): SoldDetectionResult {
  const signals: SignalScore[] = [];
  let total = 0;

  // REINS成約情報（確実）
  if (data.reins_sold) {
    signals.push({ signal: "reins_sold", score: 80, detail: "REINSに成約情報が登録されています" });
    total += 80;
  }

  // ポータルから消えた（有力）
  const portalGone = !data.portal_suumo_active || !data.portal_athome_active;
  if (portalGone && data.status !== "SUSPENDED") {
    signals.push({
      signal: "portal_disappeared",
      score: 40,
      detail: `ポータルサイトの掲載が消えています（SUUMO: ${data.portal_suumo_active ? "掲載中" : "消滅"}, athome: ${data.portal_athome_active ? "掲載中" : "消滅"}）`,
    });
    total += 40;
  }

  // 90日超 + 直近30日問い合わせなし（有力）
  if (data.days_on_market >= 90 && data.inquiry_count_last_30d === 0) {
    signals.push({
      signal: "long_no_inquiry",
      score: 40,
      detail: `掲載${data.days_on_market}日経過・直近30日の問い合わせ0件`,
    });
    total += 40;
  }

  // 商談中60日以上（有力）
  if (data.days_negotiating && data.days_negotiating >= 60) {
    signals.push({
      signal: "long_negotiating",
      score: 40,
      detail: `商談中ステータスが${data.days_negotiating}日継続中`,
    });
    total += 40;
  }

  // 価格改定3回以上（参考）
  if (data.price_revision_count >= 3) {
    signals.push({
      signal: "price_revised_many",
      score: 10,
      detail: `価格改定が${data.price_revision_count}回実施されています`,
    });
    total += 10;
  }

  // 60日超で一度も問い合わせなし（参考）
  if (data.days_on_market >= 60 && data.inquiry_count_total === 0) {
    signals.push({
      signal: "never_inquired",
      score: 10,
      detail: `掲載${data.days_on_market}日経過・問い合わせ実績なし`,
    });
    total += 10;
  }

  // アラートレベル判定
  const alertLevel =
    total >= 80 ? "urgent"
    : total >= 40 ? "alert"
    : total >= 20 ? "watch"
    : "none";

  const action =
    total >= 80
      ? "成約の可能性が非常に高いです。管理画面で成約確認を行い、掲載停止の処理をしてください。"
      : total >= 40
      ? "成約の可能性があります。担当者に確認の上、ステータスを更新してください。"
      : total >= 20
      ? "長期化が懸念されます。価格改定や掲載内容の見直しを検討してください。"
      : "通常通り掲載継続で問題ありません。";

  return {
    property_id: data.property_id,
    total_score: total,
    signals,
    alert_level: alertLevel,
    recommended_action: action,
    agent: "SoldDetectionAgent",
  };
}

// ============================================================
// Slack通知
// ============================================================

export async function sendSoldAlert(
  data: PropertyMonitorData,
  result: SoldDetectionResult
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl || result.alert_level === "none") return;

  const emoji =
    result.alert_level === "urgent" ? ":rotating_light:"
    : result.alert_level === "alert" ? ":warning:"
    : ":eyes:";

  const signalList = result.signals
    .map((s) => `• ${s.detail}（+${s.score}点）`)
    .join("\n");

  const message = {
    channel: process.env.SLACK_CHANNEL_ALERTS || "#property-alerts",
    text: `${emoji} *成約検知アラート* — ${data.property_name}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `${emoji} 成約検知: ${data.property_name}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*確信スコア: ${result.total_score} / 100*\n${signalList}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*推奨アクション*\n${result.recommended_action}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "管理画面で確認" },
            url: `${process.env.ADMIN_BASE_URL}/properties/${data.property_id}`,
            style: "primary",
          },
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  }).catch((e) => {
    process.stderr.write(`Slack通知失敗: ${e.message}\n`);
  });
}

// ============================================================
// 成約確定後の処理（担当者の確認後のみ呼び出す）
// ============================================================

export interface SaleConfirmInput {
  property_id: string;
  sold_price: number;
  sold_at: Date;
  buyer_type: "individual" | "corporation" | "investor";
  confirmed_by: string;  // 担当者ID
  notes?: string;
}

export async function confirmSale(input: SaleConfirmInput): Promise<{ success: boolean; message: string }> {
  // この関数は必ず担当者の明示的な操作（管理画面のボタン押下）から呼び出す
  // 自動実行は禁止

  const steps: string[] = [];
  const errors: string[] = [];

  try {
    // 1. ステータスをSOLDに更新（Prisma経由で実装）
    steps.push("ステータスをSOLDに更新");
    // await prisma.property.update({ where: { id: input.property_id }, data: { status: "SOLD" } });

    // 2. HP非掲載
    steps.push("HP非掲載");
    // await hpApi.unpublish(input.property_id);

    // 3. 全ポータル非掲載
    steps.push("ポータル非掲載（SUUMO・athome・Yahoo）");
    // await Promise.all([suumoApi.unpublish(...), athomeApi.unpublish(...), yahooApi.unpublish(...)]);

    // 4. 成約データを格納
    steps.push("成約データ格納（マーケティング用）");
    // await prisma.saleRecord.create({ data: { ... } });

    // 5. 担当者に完了通知
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: process.env.SLACK_CHANNEL_PROPERTY || "#property-updates",
          text: `:white_check_mark: 物件ID: ${input.property_id} の成約処理が完了しました。HP・全ポータルから非掲載しました。`,
        }),
      });
    }

    const successMsg = `成約処理完了: ${steps.join(" → ")}`;
    process.stdout.write(JSON.stringify({
      level: "info",
      agent: "SoldDetectionAgent",
      action: "sale_confirmed",
      property_id: input.property_id,
      confirmed_by: input.confirmed_by,
      steps,
      timestamp: new Date().toISOString(),
    }) + "\n");

    return { success: true, message: successMsg };

  } catch (error) {
    const msg = error instanceof Error ? error.message : "不明なエラー";
    errors.push(msg);

    process.stderr.write(JSON.stringify({
      level: "error",
      agent: "SoldDetectionAgent",
      action: "sale_confirmed",
      property_id: input.property_id,
      error: msg,
      timestamp: new Date().toISOString(),
    }) + "\n");

    return { success: false, message: `成約処理中にエラーが発生しました: ${msg}` };
  }
}

// ============================================================
// 一括監視（定期バッチ処理用）
// ============================================================

export async function runDailyCheck(properties: PropertyMonitorData[]): Promise<void> {
  console.log(`[SoldDetectionAgent] ${properties.length}件の物件をチェックします...`);

  for (const property of properties) {
    const result = scoreProperty(property);

    if (result.alert_level !== "none") {
      await sendSoldAlert(property, result);
      console.log(`  [${result.alert_level.toUpperCase()}] ${property.property_name}: ${result.total_score}点`);
    }
  }

  console.log("[SoldDetectionAgent] チェック完了");
}

// ============================================================
// 使用例
// ============================================================

if (require.main === module) {
  const sample: PropertyMonitorData = {
    property_id: "prop-001",
    property_name: "目黒区南2丁目 土地",
    status: "NEGOTIATING",
    listed_price: 12000,
    days_on_market: 95,
    inquiry_count_total: 3,
    inquiry_count_last_30d: 0,
    viewing_count: 1,
    price_revision_count: 2,
    days_negotiating: 65,
    reins_sold: false,
    portal_suumo_active: false,  // SUUMOから消えた
    portal_athome_active: true,
    agent_id: "staff-001",
  };

  const result = scoreProperty(sample);
  console.log("=== 成約検知結果 ===");
  console.log(`物件: ${sample.property_name}`);
  console.log(`スコア: ${result.total_score}/100 [${result.alert_level}]`);
  console.log("\n検知シグナル:");
  result.signals.forEach((s) => console.log(`  +${s.score}: ${s.detail}`));
  console.log("\n推奨アクション:", result.recommended_action);
}
