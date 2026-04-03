"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type CurrentUser = {
  name?: string | null;
  permission?: string | null;
  staffId?: string | null;
};

const navItems = [
  { href: "/admin", label: "ダッシュボード", icon: "▦" },
  { href: "/admin/properties", label: "物件一覧", icon: "⌂" },
  { href: "/admin/approvals", label: "広告確認待ち", icon: "✓" },
  { href: "/admin/sold", label: "成約アラート", icon: "!" },
  { href: "/admin/customers", label: "顧客管理", icon: "人" },
  { href: "/admin/customers/follow-up", label: "AI追客", icon: "🤖" },
  { href: "/admin/contracts", label: "契約管理", icon: "📄" },
  { href: "/admin/sales", label: "売上管理", icon: "¥" },
  { href: "/admin/mansions", label: "マンションマスタ", icon: "🏢" },
  { href: "/admin/environment-images", label: "周辺環境写真", icon: "🌳" },
  { href: "/admin/import", label: "データインポート", icon: "📥" },
  { href: "/admin/competitor", label: "競合モニタリング", icon: "📊" },
  { href: "/admin/private-properties", label: "未公開物件DB", icon: "🔒" },
  { href: "/admin/staff", label: "スタッフ管理", icon: "👤" },
  { href: "/admin/settings", label: "会社・店舗設定", icon: "⚙" },
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
      <nav style={{ padding: "8px 0", flex: 1 }}>
        {navItems.map((item) => {
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
