export const PROPERTY_STATUS = {
  // === 登録フェーズ ===
  DRAFT: {
    label: "下書き",
    color: "#9e9e9e",
    bg: "#f5f5f5",
    icon: "✏️",
    description: "基本情報入力中",
    next: ["AD_PENDING"],
  },

  // === 広告確認フェーズ ===
  AD_PENDING: {
    label: "広告確認待ち",
    color: "#e65100",
    bg: "#fff3e0",
    icon: "📨",
    description: "元付業者への広告確認書送付待ち",
    next: ["AD_SENT"],
    alert: true,
  },
  AD_SENT: {
    label: "確認書送付済み",
    color: "#f57c00",
    bg: "#fff8e1",
    icon: "📤",
    description: "広告確認書送付済み・返信待ち",
    next: ["AD_OK", "AD_NG"],
    alert: true,
  },
  AD_OK: {
    label: "広告OK",
    color: "#2e7d32",
    bg: "#e8f5e9",
    icon: "✅",
    description: "広告承諾取得済み",
    next: ["PHOTO_NEEDED", "PUBLISHING"],
  },
  AD_NG: {
    label: "広告不可",
    color: "#c62828",
    bg: "#ffebee",
    icon: "❌",
    description: "広告承諾が得られなかった",
    next: ["DRAFT"],
  },

  // === 写真・コンテンツフェーズ ===
  PHOTO_NEEDED: {
    label: "写真撮影待ち",
    color: "#6a1b9a",
    bg: "#f3e5f5",
    icon: "📷",
    description: "現地撮影が必要",
    next: ["PUBLISHING", "CONTENT_CHECK"],
    alert: true,
  },

  // === 掲載フェーズ ===
  PUBLISHING: {
    label: "掲載準備中",
    color: "#1565c0",
    bg: "#e3f2fd",
    icon: "🔧",
    description: "HP・ポータルへの掲載設定中",
    next: ["PUBLISHED"],
  },
  PUBLISHED: {
    label: "掲載中",
    color: "#1b5e20",
    bg: "#e8f5e9",
    icon: "🟢",
    description: "HP・ポータルに掲載中",
    next: ["PHOTO_NEEDED", "CONTENT_CHECK", "SOLD_ALERT"],
  },

  // === 確認・修正フェーズ ===
  CONTENT_CHECK: {
    label: "内容確認中",
    color: "#4527a0",
    bg: "#ede7f6",
    icon: "🔍",
    description: "掲載内容の確認・修正中",
    next: ["PUBLISHED"],
  },

  // === 終了フェーズ ===
  SOLD_ALERT: {
    label: "成約アラート",
    color: "#b71c1c",
    bg: "#fce4ec",
    icon: "🔔",
    description: "成約の可能性あり・確認が必要",
    next: ["SOLD", "PUBLISHED"],
    alert: true,
  },
  SOLD: {
    label: "成約済み",
    color: "#4e342e",
    bg: "#efebe9",
    icon: "🏡",
    description: "成約・取引完了",
    next: ["CLOSED"],
  },
  CLOSED: {
    label: "掲載終了",
    color: "#616161",
    bg: "#f5f5f5",
    icon: "🔒",
    description: "掲載終了・アーカイブ",
    next: [],
  },
} as const;

export type PropertyStatus = keyof typeof PROPERTY_STATUS;

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  const statusDef = PROPERTY_STATUS[from];
  return (statusDef.next as readonly string[]).includes(to);
}

export function getStatusDef(status: string) {
  return PROPERTY_STATUS[status as PropertyStatus] ?? {
    label: status,
    color: "#9e9e9e",
    bg: "#f5f5f5",
    icon: "•",
    description: "",
    next: [],
  };
}

// Active statuses (not terminal)
export const ACTIVE_STATUSES: PropertyStatus[] = [
  "DRAFT", "AD_PENDING", "AD_SENT", "AD_OK", "PHOTO_NEEDED",
  "PUBLISHING", "PUBLISHED", "CONTENT_CHECK", "SOLD_ALERT",
];

// Kanban columns to display on dashboard
export const KANBAN_COLUMNS: PropertyStatus[] = [
  "DRAFT", "AD_PENDING", "AD_SENT", "PHOTO_NEEDED", "PUBLISHING", "PUBLISHED", "SOLD_ALERT",
];
