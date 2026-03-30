"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PROPERTY_STATUS, KANBAN_COLUMNS, getStatusDef } from "@/lib/workflow-status";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  license_expiry: string | null;
}

interface PropertySummary {
  id: string;
  status: string;
  city: string;
  town: string | null;
  price: number;
  property_type: string;
  photo_count: number;
  pending_tasks: string[];
  ad_confirmation_sent_at: string | null;
  published_at: string | null;
  _count: { images: number };
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [licenseAlerts, setLicenseAlerts] = useState<{ company: string; expiry: Date; daysLeft: number }[]>([]);

  useEffect(() => {
    fetch("/api/properties?take=300")
      .then(r => r.json())
      .then(d => setProperties(d.properties ?? []))
      .catch(() => {})
      .finally(() => setLoadingProps(false));

    fetch("/api/companies")
      .then(r => r.json())
      .then((d: { companies: Company[] }) => {
        const today = new Date();
        const alerts = (d.companies ?? []).flatMap(c =>
          c.license_expiry ? [{
            company: c.name,
            expiry: new Date(c.license_expiry),
            daysLeft: Math.ceil((new Date(c.license_expiry).getTime() - today.getTime()) / 86_400_000),
          }] : []
        ).filter(a => a.daysLeft <= 90);
        setLicenseAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  // Group by status
  const byStatus = new Map<string, PropertySummary[]>();
  for (const p of properties) {
    if (!byStatus.has(p.status)) byStatus.set(p.status, []);
    byStatus.get(p.status)!.push(p);
  }

  const publishedCount = (byStatus.get("PUBLISHED") ?? []).length;
  const adPendingCount = (byStatus.get("AD_PENDING") ?? []).length + (byStatus.get("AD_SENT") ?? []).length;
  const soldAlertCount = (byStatus.get("SOLD_ALERT") ?? []).length;
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const soldThisMonth = properties.filter(p => p.status === "SOLD" && p.created_at > thisMonth.toISOString()).length;

  const noPhotoProps = properties.filter(p =>
    !["DRAFT", "SOLD", "CLOSED", "AD_NG"].includes(p.status) &&
    (p.photo_count ?? p._count?.images ?? 0) === 0
  );
  const adSentOverdue = (byStatus.get("AD_SENT") ?? []).filter(p => {
    const days = daysSince(p.ad_confirmation_sent_at);
    return days !== null && days >= 3;
  });
  const lowPhotoProps = properties.filter(p =>
    !["DRAFT", "SOLD", "CLOSED", "AD_NG", "AD_PENDING"].includes(p.status) &&
    (p.photo_count ?? p._count?.images ?? 0) > 0 &&
    (p.photo_count ?? p._count?.images ?? 0) < 5
  );

  const hasCritical = adPendingCount > 0 || noPhotoProps.length > 0;
  const hasWarning = adSentOverdue.length > 0 || lowPhotoProps.length > 0;
  const actionRequired = properties.filter(p => (p.pending_tasks?.length ?? 0) > 0 && !["SOLD", "CLOSED"].includes(p.status));

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#3a2a1a" }}>物件管理ダッシュボード</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 3 }}>フェリアホーム 物件情報管理システム</p>
      </div>

      {/* License alerts */}
      {licenseAlerts.map(a => (
        <Link key={a.company} href="/admin/settings" style={{ textDecoration: "none", display: "block", marginBottom: 8 }}>
          <div style={{ background: a.daysLeft <= 30 ? "#fde8e8" : "#fff8e1", border: `1px solid ${a.daysLeft <= 30 ? "#fcc" : "#ffe082"}`, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>{a.daysLeft <= 30 ? "🚨" : "⚠️"}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: a.daysLeft <= 30 ? "#8c1f1f" : "#f57f17" }}>
              宅建業免許 期限警告 — {a.company}
            </span>
            <span style={{ fontSize: 12, color: "#5a4a3a" }}>
              {a.expiry.toLocaleDateString("ja-JP")} まで（残り{a.daysLeft}日）
            </span>
          </div>
        </Link>
      ))}

      {/* Alert banner */}
      {(hasCritical || hasWarning) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 16, marginBottom: 20 }}>
          {hasCritical && (
            <div style={{ marginBottom: hasWarning ? 12 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#8c1f1f", marginBottom: 8 }}>
                <span style={{ background: "#fdeaea", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>🔴 要対応: {adPendingCount + noPhotoProps.length}件</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {adPendingCount > 0 && (
                  <div style={{ fontSize: 13, color: "#3a2a1a", display: "flex", alignItems: "center", gap: 10 }}>
                    <span>• 広告確認書 未送付: {adPendingCount}件</span>
                    <Link href="/admin/properties?status=AD_PENDING" style={{ fontSize: 12, color: "#8c1f1f", fontWeight: 600, textDecoration: "none" }}>→ 今すぐ送付する</Link>
                  </div>
                )}
                {noPhotoProps.length > 0 && (
                  <div style={{ fontSize: 13, color: "#3a2a1a", display: "flex", alignItems: "center", gap: 10 }}>
                    <span>• 写真 0枚: {noPhotoProps.length}件（{noPhotoProps.slice(0, 2).map(p => `${p.city}${p.town ?? ""}`).join("、")}）</span>
                    <Link href={`/admin/properties/${noPhotoProps[0]?.id}`} style={{ fontSize: 12, color: "#8c1f1f", fontWeight: 600, textDecoration: "none" }}>→ 写真を追加する</Link>
                  </div>
                )}
              </div>
            </div>
          )}
          {hasWarning && (
            <div style={{ borderTop: hasCritical ? "1px solid #f2f1ed" : "none", paddingTop: hasCritical ? 12 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#8a5200", marginBottom: 8 }}>
                <span style={{ background: "#fff8e1", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>🟡 確認推奨: {adSentOverdue.length + lowPhotoProps.length}件</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {adSentOverdue.length > 0 && (
                  <div style={{ fontSize: 13, color: "#3a2a1a", display: "flex", alignItems: "center", gap: 10 }}>
                    <span>• 広告確認書 返信待ち3日超過: {adSentOverdue.length}件</span>
                    <Link href="/admin/properties?status=AD_SENT" style={{ fontSize: 12, color: "#8a5200", fontWeight: 600, textDecoration: "none" }}>→ リマインドを送る</Link>
                  </div>
                )}
                {lowPhotoProps.length > 0 && (
                  <div style={{ fontSize: 13, color: "#3a2a1a", display: "flex", alignItems: "center", gap: 10 }}>
                    <span>• 写真5枚未満: {lowPhotoProps.length}件</span>
                    <Link href="/admin/properties" style={{ fontSize: 12, color: "#8a5200", fontWeight: 600, textDecoration: "none" }}>→ 一覧を見る</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "掲載中物件", value: publishedCount, color: "#1b5e20" },
          { label: "広告確認待ち", value: adPendingCount, color: "#e65100" },
          { label: "成約アラート", value: soldAlertCount, color: "#b71c1c" },
          { label: "今月の成約", value: soldThisMonth, color: "#1a3f6e" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "16px 20px", borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 10, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: k.value > 0 ? k.color : "#1c1b18" }}>
              {k.value}<span style={{ fontSize: 13, fontWeight: 400, color: "#706e68", marginLeft: 3 }}>件</span>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Kanban */}
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a" }}>ワークフロー状況</h2>
        <Link href="/admin/properties" style={{ fontSize: 12, color: "#706e68", textDecoration: "none" }}>全物件一覧 →</Link>
      </div>

      {loadingProps ? (
        <div style={{ color: "#aaa", fontSize: 13, padding: 24 }}>読み込み中...</div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 }}>
          {KANBAN_COLUMNS.map(statusKey => {
            const def = PROPERTY_STATUS[statusKey];
            const items = byStatus.get(statusKey) ?? [];
            return (
              <div key={statusKey} style={{ flexShrink: 0, width: 195, background: "#fff", borderRadius: 10, border: "1px solid #e0deda", overflow: "hidden" }}>
                <div style={{ background: def.bg, padding: "9px 12px", borderBottom: "1px solid #e0deda", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: def.color }}>{def.icon} {def.label}</span>
                  <span style={{ fontSize: 11, background: def.color, color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>{items.length}</span>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 440, overflowY: "auto" }}>
                  {items.length === 0 && (
                    <div style={{ color: "#ccc", fontSize: 11, textAlign: "center", padding: "12px 0" }}>なし</div>
                  )}
                  {items.slice(0, 8).map(p => {
                    const photoCount = p.photo_count ?? p._count?.images ?? 0;
                    const sentDays = daysSince(p.ad_confirmation_sent_at);
                    const isOverdue = statusKey === "AD_SENT" && sentDays !== null && sentDays >= 3;
                    return (
                      <Link key={p.id} href={`/admin/properties/${p.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ background: isOverdue ? "#fff8f0" : "#fafaf8", borderRadius: 8, padding: "8px 10px", border: `1px solid ${isOverdue ? "#f9a825" : "#ede9e4"}` }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#3a2a1a", marginBottom: 3, lineHeight: 1.3 }}>
                            {p.city}{p.town ? p.town.slice(0, 5) : ""}
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>
                            {TYPE_LABELS[p.property_type] ?? ""} {p.price.toLocaleString()}万
                          </div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {photoCount === 0 && !["DRAFT", "AD_PENDING", "AD_SENT"].includes(statusKey) && (
                              <span style={{ fontSize: 9, background: "#fdeaea", color: "#8c1f1f", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>📷なし</span>
                            )}
                            {photoCount > 0 && (
                              <span style={{ fontSize: 9, color: "#888" }}>📷{photoCount}</span>
                            )}
                            {isOverdue && (
                              <span style={{ fontSize: 9, background: "#fff0e0", color: "#e65100", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>⚠️{sentDays}日</span>
                            )}
                            {(p.pending_tasks?.length ?? 0) > 0 && (
                              <span style={{ fontSize: 9, color: "#8c1f1f" }}>❌{p.pending_tasks.length}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {items.length > 8 && (
                    <Link href={`/admin/properties?status=${statusKey}`} style={{ fontSize: 10, color: "#888", textAlign: "center", textDecoration: "none", padding: "4px 0" }}>
                      …他{items.length - 8}件
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action required list */}
      {!loadingProps && actionRequired.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 12 }}>要対応物件</h2>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8f6f3" }}>
                  {["物件", "ステータス", "未完了必須タスク", ""].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#888", borderBottom: "1px solid #e8e4e0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actionRequired.slice(0, 10).map(p => {
                  const def = getStatusDef(p.status);
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f2f1ed" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 500 }}>{p.city}{p.town ?? ""}</div>
                        <div style={{ color: "#888", fontSize: 11 }}>{p.price.toLocaleString()}万円</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: def.bg, color: def.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
                          {def.icon} {def.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(p.pending_tasks ?? []).slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: 10, background: "#fdeaea", color: "#8c1f1f", padding: "1px 6px", borderRadius: 4 }}>❌ {t}</span>
                          ))}
                          {(p.pending_tasks?.length ?? 0) > 3 && (
                            <span style={{ fontSize: 10, color: "#888" }}>…他{(p.pending_tasks?.length ?? 0) - 3}件</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/admin/properties/${p.id}`} style={{ fontSize: 12, color: "#234f35", fontWeight: 600, textDecoration: "none" }}>対応する →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
