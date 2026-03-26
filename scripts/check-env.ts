/**
 * 環境変数チェックスクリプト
 * npm run check-env で実行
 *
 * 必須の環境変数が設定されているか確認し、
 * 不足している場合は何を設定すべきか案内する。
 */

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
  phase: "now" | "later";
}

const checks: EnvCheck[] = [
  // ===== 必須（今すぐ必要） =====
  { key: "DATABASE_URL", required: true, description: "PostgreSQL 接続文字列（専用DB）", phase: "now" },
  { key: "ANTHROPIC_API_KEY", required: true, description: "Claude AI API キー", phase: "now" },
  { key: "NEXTAUTH_SECRET", required: true, description: "NextAuth 署名シークレット（openssl rand -base64 32）", phase: "now" },
  { key: "NEXTAUTH_URL", required: true, description: "管理画面URL（例: http://localhost:3001）", phase: "now" },
  { key: "SLACK_WEBHOOK_URL", required: true, description: "Slack Webhook URL（通知用）", phase: "now" },

  // ===== 準必須（S3設定） =====
  { key: "AWS_ACCESS_KEY_ID", required: true, description: "AWS アクセスキー（S3用）", phase: "now" },
  { key: "AWS_SECRET_ACCESS_KEY", required: true, description: "AWS シークレットキー", phase: "now" },
  { key: "S3_BUCKET_NAME", required: true, description: "S3 バケット名（物件写真・PDF格納）", phase: "now" },

  // ===== CRM連携 =====
  { key: "CRM_API_BASE_URL", required: true, description: "既存CRM の API ベースURL", phase: "now" },
  { key: "CRM_API_KEY", required: true, description: "既存CRM の API キー", phase: "now" },

  // ===== 後で追加（Phase 2以降） =====
  { key: "SUUMO_API_KEY", required: false, description: "SUUMO API キー（ポータル連動）", phase: "later" },
  { key: "ATHOME_API_KEY", required: false, description: "athome API キー", phase: "later" },
  { key: "YAHOO_REAL_ESTATE_API_KEY", required: false, description: "Yahoo不動産 API キー", phase: "later" },
  { key: "GOOGLE_CALENDAR_CLIENT_ID", required: false, description: "Google Calendar（内見管理）", phase: "later" },
  { key: "MLIT_API_KEY", required: false, description: "国土交通省 不動産情報ライブラリ（査定用）", phase: "later" },
];

function check() {
  console.log("\n🔍 フェリアホーム 物件管理システム — 環境変数チェック\n");
  console.log("=".repeat(60));

  const missing: EnvCheck[] = [];
  const ok: EnvCheck[] = [];
  const optional: EnvCheck[] = [];

  for (const c of checks) {
    const val = process.env[c.key];
    if (val && val.length > 0) {
      ok.push(c);
    } else if (c.required) {
      missing.push(c);
    } else {
      optional.push(c);
    }
  }

  // OK
  if (ok.length > 0) {
    console.log(`\n✅ 設定済み（${ok.length}件）`);
    ok.forEach((c) => console.log(`   ${c.key}`));
  }

  // 未設定（必須）
  if (missing.length > 0) {
    console.log(`\n❌ 未設定（必須・${missing.length}件）— .env.local に追加してください`);
    missing.forEach((c) => {
      console.log(`\n   ${c.key}`);
      console.log(`   → ${c.description}`);
    });
  }

  // オプション
  if (optional.length > 0) {
    console.log(`\n⚙️  未設定（Phase 2以降・${optional.length}件）— 後で追加OK`);
    optional.forEach((c) => console.log(`   ${c.key}: ${c.description}`));
  }

  console.log("\n" + "=".repeat(60));

  if (missing.length > 0) {
    console.log(`\n⛔ ${missing.length}件の必須環境変数が未設定です。`);
    console.log("   .env.example をコピーして .env.local を作成してください:\n");
    console.log("   cp .env.example .env.local\n");
    process.exit(1);
  } else {
    console.log("\n🎉 すべての必須環境変数が設定されています！\n");
    console.log("   npm run dev でサーバーを起動できます（ポート: 3001）\n");
  }
}

check();
