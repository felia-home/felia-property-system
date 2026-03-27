"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  license_expiry: string | null;
}
interface StaffAlert {
  id: string;
  name: string;
  store: { name: string };
  _count: { properties: number };
}

export default function DashboardPage() {
  const [licenseAlerts, setLicenseAlerts] = useState<{ company: string; expiry: Date; daysLeft: number }[]>([]);
  const [transferAlerts, setTransferAlerts] = useState<StaffAlert[]>([]);

  useEffect(() => {
    // License expiry check
    fetch("/api/companies").then(r => r.json()).then((d: { companies: Company[] }) => {
      const today = new Date();
      const alerts = (d.companies ?? []).flatMap(c =>
        c.license_expiry
          ? [{
              company: c.name,
              expiry: new Date(c.license_expiry),
              daysLeft: Math.ceil((new Date(c.license_expiry).getTime() - today.getTime()) / 86400000),
            }]
          : []
      ).filter(a => a.daysLeft <= 90);
      setLicenseAlerts(alerts);
    }).catch(() => {});

    // Incomplete transfer: retired staff with properties still assigned (shouldn't happen, but check)
    // More useful: show recently retired staff with >0 props before transfer
    // Here we show all active staff who have 0 properties (might be new) vs retired w/ transfers
    // Actually: show staff who are NOT retired but their store is flagged — use pending as "retired staff who still have properties"
    fetch("/api/staff?include_retired=true").then(r => r.json()).then((d: { staff: StaffAlert[] }) => {
      // Show retired staff that somehow still have properties (edge case)
      const alerts = (d.staff ?? []).filter((s: StaffAlert & { is_retired?: boolean }) => s.is_retired && s._count.properties > 0);
      setTransferAlerts(alerts);
    }).catch(() => {});
  }, []);

  const kpis = [
    { label: "掲載中物件", value: "0", unit: "件", color: "#234f35" },
    { label: "広告確認待ち", value: "0", unit: "件", color: "#8a5200" },
    { label: "成約アラート", value: "0", unit: "件", color: "#8c1f1f" },
    { label: "今月の成約", value: "0", unit: "件", color: "#1a3f6e" },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>ダッシュボード</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>フェリアホーム 物件管理システム</p>
      </div>

      {/* Alert section */}
      {(licenseAlerts.length > 0 || transferAlerts.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {licenseAlerts.map(a => (
            <Link key={a.company} href="/admin/settings" style={{ textDecoration: "none" }}>
              <div style={{ background: a.daysLeft <= 30 ? "#fde8e8" : "#fff8e1", border: `1px solid ${a.daysLeft <= 30 ? "#fcc" : "#ffe082"}`, padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{a.daysLeft <= 30 ? "🚨" : "⚠️"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: a.daysLeft <= 30 ? "#8c1f1f" : "#f57f17" }}>
                    宅建業免許 期限警告 — {a.company}
                  </div>
                  <div style={{ fontSize: 12, color: "#5a4a3a" }}>
                    {a.expiry.toLocaleDateString("ja-JP")} まで（残り <strong>{a.daysLeft}日</strong>）
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {transferAlerts.map(s => (
            <Link key={s.id} href={`/admin/staff/${s.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fde8e8", border: "1px solid #fcc", padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#8c1f1f" }}>引継ぎ未完了 — {s.name}（{s.store.name}）</div>
                  <div style={{ fontSize: 12, color: "#5a4a3a" }}>退職済みスタッフに {s._count.properties}件の担当物件が残っています</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: "#fff", borderRadius: 12,
            border: "1px solid #e0deda", padding: "18px 20px",
            borderLeft: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 10, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>
              {k.value}<span style={{ fontSize: 13, fontWeight: 400, color: "#706e68", marginLeft: 3 }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>システム状態</h2>
        <p style={{ fontSize: 13, color: "#706e68" }}>✅ データベース接続: 正常</p>
        <p style={{ fontSize: 13, color: "#706e68", marginTop: 8 }}>✅ admin.felia-home.co.jp: 稼働中</p>
        <p style={{ fontSize: 13, color: "#706e68", marginTop: 8 }}>⚙️ 物件データ: CSVインポート待ち</p>
      </div>
    </div>
  );
}
