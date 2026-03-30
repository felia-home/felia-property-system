/**
 * フェリアホーム 物件ワークフロー定義
 * 全ステータス・遷移ルール・アクション・チェック関数
 */

export type WorkflowStatus =
  | "DRAFT"
  | "AD_REQUEST"
  | "AD_NG"
  | "AD_OK"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "SOLD_ALERT"
  | "SOLD"
  | "CLOSED";

export interface WorkflowAction {
  id: string;
  label: string;
  to: WorkflowStatus;
  variant: "primary" | "danger" | "secondary";
  requires?: string[]; // field names that must be present
  confirm?: string;    // confirmation message
}

export interface WorkflowStep {
  status: WorkflowStatus;
  label: string;
  description: string;
  role: "sales" | "admin" | "both";
  color: string;
  bg: string;
  icon: string;
  next: WorkflowStatus[];
  actions: WorkflowAction[];
  requirements: string[];      // field names required to enter this status
  alert_after_days?: number;   // alert if in this status longer than N days
}

export const WORKFLOW: Record<WorkflowStatus, WorkflowStep> = {
  DRAFT: {
    status: "DRAFT",
    label: "下書き",
    description: "基本情報入力中。広告確認申請前の準備フェーズ。",
    role: "sales",
    color: "#757575",
    bg: "#f5f5f5",
    icon: "✏️",
    next: ["AD_REQUEST"],
    requirements: [],
    actions: [
      {
        id: "request_ad",
        label: "広告確認を申請する",
        to: "AD_REQUEST",
        variant: "primary",
        requires: ["price", "city", "station_name1", "property_type"],
      },
    ],
  },

  AD_REQUEST: {
    status: "AD_REQUEST",
    label: "広告確認中",
    description: "元付業者への広告確認書を送付し、承諾待ちの状態。",
    role: "admin",
    color: "#e65100",
    bg: "#fff3e0",
    icon: "📨",
    next: ["AD_OK", "AD_NG"],
    requirements: ["price", "city", "station_name1", "property_type"],
    alert_after_days: 3,
    actions: [
      {
        id: "ad_ok",
        label: "広告承諾を確認した（AD_OK）",
        to: "AD_OK",
        variant: "primary",
      },
      {
        id: "ad_ng",
        label: "広告不可として処理",
        to: "AD_NG",
        variant: "danger",
        confirm: "広告不可として処理しますか？ステータスが AD_NG になります。",
      },
    ],
  },

  AD_NG: {
    status: "AD_NG",
    label: "広告不可",
    description: "元付業者から広告承諾が得られなかった。再申請または取扱い中止。",
    role: "sales",
    color: "#c62828",
    bg: "#ffebee",
    icon: "❌",
    next: ["DRAFT"],
    requirements: [],
    actions: [
      {
        id: "back_to_draft",
        label: "下書きに戻して再申請",
        to: "DRAFT",
        variant: "secondary",
      },
    ],
  },

  AD_OK: {
    status: "AD_OK",
    label: "広告OK",
    description: "広告承諾取得済み。写真・原稿の準備を進める。",
    role: "both",
    color: "#2e7d32",
    bg: "#e8f5e9",
    icon: "✅",
    next: ["READY_TO_PUBLISH"],
    requirements: ["ad_confirmed_at"],
    actions: [
      {
        id: "ready_to_publish",
        label: "掲載準備完了にする",
        to: "READY_TO_PUBLISH",
        variant: "primary",
        requires: ["photo_count"],
      },
    ],
  },

  READY_TO_PUBLISH: {
    status: "READY_TO_PUBLISH",
    label: "掲載準備完了",
    description: "掲載内容・写真の確認完了。HP・ポータルへの掲載を実行できる状態。",
    role: "admin",
    color: "#1565c0",
    bg: "#e3f2fd",
    icon: "🔧",
    next: ["PUBLISHED", "AD_OK"],
    requirements: ["ad_confirmed_at", "photo_count"],
    actions: [
      {
        id: "publish",
        label: "掲載する",
        to: "PUBLISHED",
        variant: "primary",
      },
      {
        id: "back_to_ad_ok",
        label: "修正のためAD_OKに戻す",
        to: "AD_OK",
        variant: "secondary",
      },
    ],
  },

  PUBLISHED: {
    status: "PUBLISHED",
    label: "掲載中",
    description: "HP・ポータルに掲載中。問い合わせ対応・物確を行うフェーズ。",
    role: "both",
    color: "#1b5e20",
    bg: "#e8f5e9",
    icon: "🟢",
    next: ["SOLD_ALERT", "READY_TO_PUBLISH"],
    requirements: ["published_at"],
    alert_after_days: 60,
    actions: [
      {
        id: "sold_alert",
        label: "成約アラートに変更",
        to: "SOLD_ALERT",
        variant: "secondary",
        confirm: "成約アラートに変更しますか？",
      },
      {
        id: "back_to_ready",
        label: "内容修正のため準備中に戻す",
        to: "READY_TO_PUBLISH",
        variant: "secondary",
      },
    ],
  },

  SOLD_ALERT: {
    status: "SOLD_ALERT",
    label: "成約アラート",
    description: "成約の可能性あり。担当者による確認が必要。",
    role: "sales",
    color: "#b71c1c",
    bg: "#fce4ec",
    icon: "🔔",
    next: ["SOLD", "PUBLISHED"],
    requirements: [],
    alert_after_days: 7,
    actions: [
      {
        id: "confirm_sold",
        label: "成約を確定する",
        to: "SOLD",
        variant: "danger",
        confirm: "成約を確定します。この操作は取り消せません。よろしいですか？",
      },
      {
        id: "back_to_published",
        label: "掲載を継続する",
        to: "PUBLISHED",
        variant: "secondary",
      },
    ],
  },

  SOLD: {
    status: "SOLD",
    label: "成約済み",
    description: "成約確定・全掲載終了。成約データの記録を行う。",
    role: "both",
    color: "#4e342e",
    bg: "#efebe9",
    icon: "🏡",
    next: ["CLOSED"],
    requirements: [],
    actions: [
      {
        id: "close",
        label: "クローズ（アーカイブ）",
        to: "CLOSED",
        variant: "secondary",
      },
    ],
  },

  CLOSED: {
    status: "CLOSED",
    label: "掲載終了",
    description: "掲載終了・アーカイブ済み。",
    role: "admin",
    color: "#616161",
    bg: "#f5f5f5",
    icon: "🔒",
    next: [],
    requirements: [],
    actions: [],
  },
};

// ステータス遷移バリデーション
export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  const step = WORKFLOW[from];
  return (step.next as readonly string[]).includes(to);
}

// ステータスに必要なフィールドが揃っているか確認
export function checkRequirements(
  status: WorkflowStatus,
  property: Record<string, unknown>
): { ok: boolean; missing: string[] } {
  const step = WORKFLOW[status];
  const missing = step.requirements.filter(field => {
    const val = property[field];
    if (val === null || val === undefined || val === "" || val === 0) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  });
  return { ok: missing.length === 0, missing };
}

// アラート判定: 指定ステータスに入ってから N 日以上経過したかチェック
export function checkAlert(
  status: WorkflowStatus,
  enteredAt: Date | null
): { alert: boolean; days: number | null } {
  const step = WORKFLOW[status];
  if (!step.alert_after_days || !enteredAt) return { alert: false, days: null };
  const days = Math.floor((Date.now() - enteredAt.getTime()) / 86_400_000);
  return { alert: days >= step.alert_after_days, days };
}

// ステータス定義を取得（未知のステータスはフォールバック）
export function getWorkflowStep(status: string): WorkflowStep {
  return (
    WORKFLOW[status as WorkflowStatus] ?? {
      status: status as WorkflowStatus,
      label: status,
      description: "",
      role: "both",
      color: "#9e9e9e",
      bg: "#f5f5f5",
      icon: "•",
      next: [],
      actions: [],
      requirements: [],
    }
  );
}

// Kanban表示用カラム（終了ステータスを除く）
export const WORKFLOW_KANBAN_COLUMNS: WorkflowStatus[] = [
  "DRAFT",
  "AD_REQUEST",
  "AD_OK",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "SOLD_ALERT",
];

// アクティブなステータス一覧
export const ACTIVE_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "DRAFT",
  "AD_REQUEST",
  "AD_NG",
  "AD_OK",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "SOLD_ALERT",
];
