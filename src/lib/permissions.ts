export type Permission = "ADMIN" | "MANAGER" | "SENIOR" | "AGENT" | "OFFICE";

export const PERMISSIONS: Record<Permission, {
  label: string;
  description: string;
  color: string;
  bg: string;
  level: number;
}> = {
  ADMIN: {
    label: "システム管理者",
    description: "全機能・全データへのアクセス。会社設定・スタッフ管理・売上データすべて閲覧可能",
    color: "#7b1fa2",
    bg: "#f3e5f5",
    level: 5,
  },
  MANAGER: {
    label: "店長・マネージャー",
    description: "自店舗の全物件・スタッフ管理。売上データ・顧客情報の閲覧が可能",
    color: "#1565c0",
    bg: "#e3f2fd",
    level: 4,
  },
  SENIOR: {
    label: "シニアエージェント",
    description: "物件の公開権限あり。全担当物件の編集・顧客情報の閲覧が可能",
    color: "#2e7d32",
    bg: "#e8f5e9",
    level: 3,
  },
  AGENT: {
    label: "エージェント（営業）",
    description: "自分の担当物件の登録・編集。自分の担当顧客情報のみ閲覧可能",
    color: "#e65100",
    bg: "#fff3e0",
    level: 2,
  },
  OFFICE: {
    label: "内勤スタッフ",
    description: "物件情報の入力・補完。顧客情報の閲覧（編集は制限あり）",
    color: "#37474f",
    bg: "#eceff1",
    level: 1,
  },
};

export const FEATURE_PERMISSIONS = {
  "property.view_all":      ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"],
  "property.view_own":      ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"],
  "property.create":        ["ADMIN", "MANAGER", "SENIOR", "AGENT"],
  "property.edit_own":      ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"],
  "property.edit_all":      ["ADMIN", "MANAGER"],
  "property.publish":       ["ADMIN", "MANAGER", "SENIOR"],
  "property.delete":        ["ADMIN", "MANAGER"],
  "customer.view_own":      ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"],
  "customer.view_all":      ["ADMIN", "MANAGER", "SENIOR"],
  "customer.edit_own":      ["ADMIN", "MANAGER", "SENIOR", "AGENT"],
  "customer.edit_all":      ["ADMIN", "MANAGER"],
  "customer.delete":        ["ADMIN", "MANAGER"],
  "contract.view_own":      ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"],
  "contract.view_all":      ["ADMIN", "MANAGER"],
  "contract.create":        ["ADMIN", "MANAGER", "SENIOR"],
  "contract.edit":          ["ADMIN", "MANAGER"],
  "sales.view_own":         ["ADMIN", "MANAGER", "SENIOR", "AGENT"],
  "sales.view_all":         ["ADMIN", "MANAGER"],
  "sales.export":           ["ADMIN", "MANAGER"],
  "staff.view":             ["ADMIN", "MANAGER"],
  "staff.create":           ["ADMIN"],
  "staff.edit":             ["ADMIN"],
  "staff.change_permission": ["ADMIN"],
  "staff.view_personal_info": ["ADMIN"],
  "settings.view":          ["ADMIN", "MANAGER"],
  "settings.edit":          ["ADMIN"],
  "import.execute":         ["ADMIN", "MANAGER"],
  "export.execute":         ["ADMIN", "MANAGER"],
  "competitor.view":        ["ADMIN", "MANAGER", "SENIOR"],
} as const;

export type Feature = keyof typeof FEATURE_PERMISSIONS;

export function hasPermission(staffPermission: Permission, feature: Feature): boolean {
  const allowed = FEATURE_PERMISSIONS[feature] as readonly string[];
  return allowed.includes(staffPermission);
}

export function isHigherPermission(a: Permission, b: Permission): boolean {
  return PERMISSIONS[a].level > PERMISSIONS[b].level;
}
