"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type CurrentUser = {
  name?: string | null;
  permission?: string | null;
  staffId?: string | null;
};

type NavItem = { href: string; label: string; icon: string; badge?: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "物件管理",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: "▦" },
      { href: "/admin/properties", label: "物件一覧", icon: "⌂" },
      { href: "/admin/approvals", label: "広告確認待ち", icon: "✓" },
      { href: "/admin/sold", label: "成約アラート", icon: "!" },
    ],
  },
  {
    label: "顧客管理",
    items: [
      { href: "/admin/customers", label: "ダッシュボード", icon: "人" },
      { href: "/admin/customers/follow-up", label: "AI追客", icon: "🤖" },
    ],
  },
  {
    label: "書類・契約",
    items: [
      { href: "/admin/contracts", label: "契約管理", icon: "📄" },
    ],
  },
  {
    label: "設定・管理",
    items: [
      { href: "/admin/staff", label: "スタッフ管理", icon: "👤" },
      { href: "/admin/settings", label: "会社・店舗設定", icon: "⚙" },
      { href: "/admin/sales", label: "売上管理", icon: "¥" },
      { href: "/admin/mansions", label: "マンションマスタ", icon: "🏢" },
      { href: "/admin/environment-images", label: "周辺環境写真", icon: "🌳" },
      { href: "/admin/import", label: "データインポート", icon: "📥" },
      { href: "/admin/competitor", label: "競合モニタリング", icon: "📊" },
      { href: "/admin/private-properties", label: "未公開物件DB", icon: "🔒" },
    ],
  },
];

export default function Sidebar({ currentUser }: { currentUser?: CurrentUser }) {
  const pathname = usePathname();
  return (
    <aside style={{
      width: 220, background: "#1c1b18", color: "#fff",
      display: "flex", flexDirection: "column",
      minHeight: "100vh", flexShrink: 0,
    }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".04em" }}>Felia Home</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 3, letterSpacing: ".1em" }}>PROPERTY MANAGEMENT</div>
      </div>

      <nav style={{ padding: "4px 0", flex: 1, overflowY: "auto" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* グループラベル */}
            <div style={{ padding: "16px 20px 4px" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)",
                letterSpacing: "0.15em", textTransform: "uppercase",
              }}>
                {group.label}
              </span>
            </div>

            {/* グループ内アイテム */}
            {(group.items ?? []).map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 20px", fontSize: 13,
                  color: active ? "#fff" : "rgba(255,255,255,.55)",
                  background: active ? "rgba(255,255,255,.09)" : "transparent",
                  borderLeft: active ? "2px solid #4a8a60" : "2px solid transparent",
                  textDecoration: "none",
                }}>
                  <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: "#b83030", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 7px", borderRadius: 10,
                    }}>{item.badge}</span>
                  )}
                </Link>
              );
            })}

            {/* グループ間区切り線（最後以外） */}
            {gi < NAV_GROUPS.length - 1 && (
              <div style={{ margin: "6px 16px 2px", borderTop: "1px solid rgba(255,255,255,.08)" }} />
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,.07)", fontSize: 12 }}>
        {currentUser?.name && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{currentUser.permission}</div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", padding: "6px 0", background: "rgba(255,255,255,.08)", border: "none", borderRadius: 6, color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}
        >
          ログアウト
        </button>
        <div style={{ color: "rgba(255,255,255,.3)" }}>admin.felia-home.co.jp</div>
      </div>
    </aside>
  );
}
