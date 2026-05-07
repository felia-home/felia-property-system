// 顧客アクション種別の定義
export const ACTIVITY_TYPES = {
  // ── 営業フェーズ ────────────────────────────
  CALL:    { label: "📞 電話",     phase: "SALES",    color: "#3b82f6" },
  EMAIL:   { label: "✉️ メール",   phase: "SALES",    color: "#8b5cf6" },
  LETTER:  { label: "📬 投函",     phase: "SALES",    color: "#f59e0b" },
  SHOWING: { label: "🏠 案内",     phase: "SALES",    color: "#22c55e" },
  VISIT:   { label: "🏢 来社",     phase: "SALES",    color: "#06b6d4" },
  // ── 契約フェーズ ────────────────────────────
  RESEARCH:      { label: "🔍 物件調査", phase: "CONTRACT", color: "#f97316" },
  CONTRACT_DOCS: { label: "📋 書類作成", phase: "CONTRACT", color: "#ef4444" },
  CONTRACT:      { label: "📝 契約",     phase: "CONTRACT", color: "#dc2626" },
  SETTLEMENT:    { label: "💰 決済",     phase: "CONTRACT", color: "#9333ea" },
  AFTER:         { label: "🎁 アフター", phase: "CONTRACT", color: "#6b7280" },
  // ── その他 ──────────────────────────────────
  MEMO:    { label: "📝 メモ",     phase: "SALES",    color: "#9ca3af" },
  AI_AUTO: { label: "🤖 AI自動",   phase: "SALES",    color: "#a855f7" },
  // 旧ラベル互換（既存データ表示のため残す）
  LINE:    { label: "💬 LINE",     phase: "SALES",    color: "#10b981" },
  MEETING: { label: "🤝 面談",     phase: "SALES",    color: "#0ea5e9" },
  VIEWING: { label: "👁 内見",     phase: "SALES",    color: "#22c55e" },
  NOTE:    { label: "📝 メモ",     phase: "SALES",    color: "#9ca3af" },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export const SALES_ACTIONS    = ["CALL", "EMAIL", "LETTER", "SHOWING", "VISIT"] as const;
export const CONTRACT_ACTIONS = ["RESEARCH", "CONTRACT_DOCS", "CONTRACT", "SETTLEMENT", "AFTER"] as const;
