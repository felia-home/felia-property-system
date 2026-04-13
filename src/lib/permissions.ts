export type Permission =
  | "ADMIN"
  | "SENIOR_MANAGER"
  | "MANAGER"
  | "BACKOFFICE"
  | "SENIOR_AGENT"
  | "AGENT";

export const PERMISSION_LEVELS: Record<Permission, number> = {
  ADMIN:          100,
  SENIOR_MANAGER: 80,
  MANAGER:        60,
  BACKOFFICE:     50,
  SENIOR_AGENT:   40,
  AGENT:          30,
};

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
    level: 100,
  },
  SENIOR_MANAGER: {
    label: "シニアマネージャー",
    description: "複数店舗の管理・全物件閲覧。スタッフ管理・売上データの閲覧が可能",
    color: "#1a237e",
    bg: "#e8eaf6",
    level: 80,
  },
  MANAGER: {
    label: "店長・マネージャー",
    description: "自店舗の全物件・スタッフ管理。売上データ・顧客情報の閲覧が可能",
    color: "#1565c0",
    bg: "#e3f2fd",
    level: 60,
  },
  BACKOFFICE: {
    label: "内勤スタッフ",
    description: "物件情報の入力・補完。顧客情報の閲覧（編集は制限あり）",
    color: "#37474f",
    bg: "#eceff1",
    level: 50,
  },
  SENIOR_AGENT: {
    label: "シニアエージェント",
    description: "物件の公開権限あり。全担当物件の編集・顧客情報の閲覧が可能",
    color: "#2e7d32",
    bg: "#e8f5e9",
    level: 40,
  },
  AGENT: {
    label: "エージェント（営業）",
    description: "自分の担当物件の登録・編集。自分の担当顧客情報のみ閲覧可能",
    color: "#e65100",
    bg: "#fff3e0",
    level: 30,
  },
};

// Map legacy role names to new ones for backward compatibility
export const LEGACY_ROLE_MAP: Record<string, Permission> = {
  SENIOR: "SENIOR_AGENT",
  OFFICE: "BACKOFFICE",
};

export function normalizePermission(p: string): Permission {
  if (p in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[p];
  if (p in PERMISSIONS) return p as Permission;
  return "AGENT";
}

export const FEATURE_PERMISSIONS = {
  // Properties
  "property.view_all":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "property.view_own":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "property.create":         ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "property.edit_own":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "property.edit_all":       ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "property.publish":        ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT"],
  "property.delete":         ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  // Customers
  "customer.view_own":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "customer.view_all":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT"],
  "customer.edit_own":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT", "AGENT"],
  "customer.edit_all":       ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "customer.delete":         ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  // Contracts
  "contract.view_own":       ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
  "contract.view_all":       ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "contract.create":         ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT"],
  "contract.edit":           ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  // Sales
  "sales.view_own":          ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT", "AGENT"],
  "sales.view_all":          ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "sales.export":            ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  // Staff
  "staff.view":              ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "staff.create":            ["ADMIN", "SENIOR_MANAGER"],
  "staff.edit":              ["ADMIN", "SENIOR_MANAGER"],
  "staff.change_permission": ["ADMIN"],
  "staff.view_personal_info":["ADMIN", "SENIOR_MANAGER"],
  // Settings & tools
  "settings.view":           ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "settings.edit":           ["ADMIN"],
  "import.execute":          ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "export.execute":          ["ADMIN", "SENIOR_MANAGER", "MANAGER"],
  "competitor.view":         ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT"],
  // Multi-store access
  "store.view_all":          ["ADMIN", "SENIOR_MANAGER"],
  "store.view_own":          ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"],
} as const;

export type Feature = keyof typeof FEATURE_PERMISSIONS;

export function hasPermission(staffPermission: string, feature: Feature): boolean {
  const normalized = normalizePermission(staffPermission);
  const allowed = FEATURE_PERMISSIONS[feature] as readonly string[];
  return allowed.includes(normalized);
}

// Alias for readability
export const canAccess = hasPermission;

export function hasPermissionLevel(userPermission: string, required: Permission): boolean {
  const normalized = normalizePermission(userPermission);
  return PERMISSION_LEVELS[normalized] >= PERMISSION_LEVELS[required];
}

export function isHigherPermission(a: string, b: string): boolean {
  const na = normalizePermission(a);
  const nb = normalizePermission(b);
  return PERMISSION_LEVELS[na] > PERMISSION_LEVELS[nb];
}

export function canAccessStore(
  userPermission: string,
  userStoreId: string | null,
  targetStoreId: string | null
): boolean {
  if (hasPermission(userPermission, "store.view_all")) return true;
  if (!userStoreId || !targetStoreId) return false;
  return userStoreId === targetStoreId;
}
