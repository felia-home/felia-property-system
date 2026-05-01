"use client";
import { useEffect, useState, Component, type ReactNode } from "react";
import Link from "next/link";
import { KANBAN_COLUMNS_GROUPED, getStatusDef } from "@/lib/workflow-status";
import { TaskCard, type TaskCardProperty } from "@/components/admin/TaskCard";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <div style={{ background: "#fdeaea", border: "1px solid #f99", borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <strong style={{ color: "#8c1f1f" }}>レンダリングエラー（ErrorBoundary捕捉）</strong>
            <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: "pre-wrap", color: "#5a1a1a" }}>{this.state.error}</pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 20px", background: "#234f35", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            ページを再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  last_ad_check_date: string | null;
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardInner() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [licenseAlerts, setLicenseAlerts] = useState<{ company: string; expiry: Date; daysLeft: number }[]>([]);
  const [takkenAlerts, setTakkenAlerts] = useState<{ name: string; daysLeft: number }[]>([]);
  const [newInquiries, setNewInquiries] = useState(0);
  const [roleTab, setRoleTab] = useState<"all" | "sales" | "backoffice">("all");

  useEffect(() => {
    fetch("/api/properties?limit=300")
      .then(r => r.json())
      .then(d => {
        const props = Array.isArray(d?.properties) ? d.properties : [];
        // Normalize nullable array fields (Prisma String[] with no default can be null in DB)
        setProperties(props.map((p: PropertySummary) => ({
          ...p,
          pending_tasks: Array.isArray(p.pending_tasks) ? p.pending_tasks : [],
          _count: p._count ?? { images: 0 },
        })));
      })
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

    fetch("/api/inquiries?status=NEW&limit=1")
      .then(r => r.json())
      .then((d: { statusCounts?: Record<string, number> }) => {
        setNewInquiries(d.statusCounts?.NEW ?? 0);
      })
      .catch(() => {});

    fetch("/api/staff?active=true&includeStats=false")
      .then(r => r.json())
      .then((d: { staff: { id: string; name: string; takken_expires_at: string | null }[] }) => {
        const today = Date.now();
        const alerts = (d.staff ?? []).filter(s => {
          if (!s.takken_expires_at) return false;
          const daysLeft = Math.floor((new Date(s.takken_expires_at).getTime() - today) / 86400000);
          return daysLeft <= 90 && daysLeft >= 0;
        }).map(s => ({
          name: s.name,
          daysLeft: Math.floor((new Date(s.takken_expires_at!).getTime() - today) / 86400000),
        }));
        setTakkenAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  // Group by status
  const byStatus = new Map<string, PropertySummary[]>();
  for (const p of (properties ?? [])) {
    if (!byStatus.has(p.status)) byStatus.set(p.status, []);
    byStatus.get(p.status)!.push(p);
  }

  const publishedCount  = (byStatus.get("PUBLISHED")  ?? []).length;
  const adPendingCount  = (byStatus.get("AD_PENDING") ?? []).length + (byStatus.get("AD_SENT") ?? []).length;
  const soldAlertCount  = (byStatus.get("SOLD_ALERT") ?? []).length;
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const soldThisMonth   = (properties ?? []).filter(p => p.status === "SOLD" && p.created_at > thisMonth.toISOString()).length;

  const noPhotoProps = (properties ?? []).filter(p =>
    !["DRAFT", "SOLD", "CLOSED", "AD_NG"].includes(p.status) &&
    (p._count?.images ?? p.photo_count ?? 0) === 0
  );
  const adSentOverdue = (byStatus.get("AD_SENT") ?? []).filter(p => {
    const days = daysSince(p.ad_confirmation_sent_at);
    return days !== null && days >= 3;
  });
  const lowPhotoProps = (properties ?? []).filter(p =>
    !["DRAFT", "SOLD", "CLOSED", "AD_NG", "AD_PENDING"].includes(p.status) &&
    (p._count?.images ?? p.photo_count ?? 0) > 0 &&
    (p._count?.images ?? p.photo_count ?? 0) < 5
  );

  const hasCritical = adPendingCount > 0 || noPhotoProps.length > 0;
  const hasWarning  = adSentOverdue.length > 0 || lowPhotoProps.length > 0;
  const actionRequired = (properties ?? []).filter(p =>
    (p.pending_tasks ?? []).length > 0 && !["SOLD", "CLOSED"].includes(p.status)
  );

  const salesAlerts = [...(byStatus.get("SOLD_ALERT") ?? [])];
  const salesActionRequired = (actionRequired ?? []).filter(p =>
    ["DRAFT", "SOLD_ALERT", "PUBLISHED"].includes(p.status)
  );

  const backofficeTasks = [
    ...(adSentOverdue ?? []),
    ...(noPhotoProps ?? []),
    ...(lowPhotoProps ?? []).filter(p => !(noPhotoProps ?? []).includes(p)),
  ];

  const publishedPhotoAlert = (byStatus.get("PUBLISHED") ?? []).filter(p => {
    const pc = p._count?.images ?? p.photo_count ?? 0;
    return pc === 0 || pc < 5;
  });

  const adCheckOverdue = (byStatus.get("PUBLISHED") ?? []).filter(p => {
    const days = daysSince(p.last_ad_check_date);
    return days === null || days >= 30;
  });

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#3a2a1a" }}>物件管理ダッシュボード</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 3 }}>フェリアホーム 物件情報管理システム</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {([["all", "全体"], ["sales", "営業向け"], ["backoffice", "内勤向け"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setRoleTab(t)}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: roleTab === t ? 700 : 400, border: "1px solid " + (roleTab === t ? "#234f35" : "#e0deda"), background: roleTab === t ? "#234f35" : "#fff", color: roleTab === t ? "#fff" : "#706e68", cursor: "pointer", fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {newInquiries > 0 && (
        <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 10, padding: "12px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#c62828" }}>📧 未対応の反響が <strong>{newInquiries}件</strong> あります</span>
          <a href="/admin/inquiries" style={{ fontSize: 13, color: "#c62828", fontWeight: 600, textDecoration: "none" }}>今すぐ確認 →</a>
        </div>
      )}

      {/* License alerts */}
      {(licenseAlerts ?? []).map(a => (
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

      {(takkenAlerts ?? []).length > 0 && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#664d03", marginBottom: 6 }}>
            ⚠️ 宅建士証の更新期限が近いスタッフがいます（{(takkenAlerts ?? []).length}名）
          </div>
          {(takkenAlerts ?? []).map(a => (
            <div key={a.name} style={{ fontSize: 12, color: "#664d03" }}>
              {a.name} — あと <strong>{a.daysLeft}日</strong>
            </div>
          ))}
          <a href="/admin/staff" style={{ fontSize: 12, color: "#8c1f1f", marginTop: 6, display: "inline-block" }}>スタッフ管理で確認 →</a>
        </div>
      )}

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
          { label: "掲載中物件",  value: publishedCount,  color: "#1b5e20" },
          { label: "広告確認待ち", value: adPendingCount, color: "#e65100" },
          { label: "成約アラート", value: soldAlertCount,  color: "#b71c1c" },
          { label: "今月の成約",   value: soldThisMonth,   color: "#1a3f6e" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "16px 20px", borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 10, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: k.value > 0 ? k.color : "#1c1b18" }}>
              {k.value}<span style={{ fontSize: 13, fontWeight: 400, color: "#706e68", marginLeft: 3 }}>件</span>
            </div>
          </div>
        ))}
      </div>

      {/* 新規物件登録 CTA */}
      <div style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2d5a3e 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", fontSize: 100, opacity: 0.08, lineHeight: 1 }}>🏠</div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, color: "#c9a96e", fontWeight: 700, letterSpacing: ".15em", marginBottom: 8 }}>STEP 1 からスタート</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>新しい物件を登録する</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 20, lineHeight: 1.6 }}>
            販売資料（PDF）をアップロードして物件情報を自動取込するのがおすすめです。
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href="/admin/properties/import" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#c9a96e", color: "#fff", padding: "14px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>📄 PDFから取込</a>
            <a href="/admin/properties/import?tab=scrape" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "14px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>🔗 URLから取込</a>
            <a href="/admin/properties/new?mode=manual" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "14px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>✏️ 手動で入力</a>
          </div>
        </div>
      </div>

      {/* あなたのタスク — 6ステップ ワークフロー */}
      {!loadingProps && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a" }}>あなたのタスク</h2>
            <span style={{ fontSize: 11, color: "#aaa" }}>業務フロー別 対応件数</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {(roleTab === "all" || roleTab === "sales") && (
              <TaskCard step={1} icon="✏️" title="情報入力" subtitle="下書き → 広告確認申請"
                count={(byStatus.get("DRAFT") ?? []).length} urgent={false}
                color="#757575" bg="#f5f5f5"
                properties={(byStatus.get("DRAFT") ?? []).slice(0, 5).map<TaskCardProperty>(p => ({
                  id: p.id, label: `${p.city}${p.town ?? ""}`, sub: `${p.price.toLocaleString()}万円`,
                }))}
                href="/admin/properties?status=DRAFT"
              />
            )}
            {(roleTab === "all" || roleTab === "backoffice") && (
              <TaskCard step={2} icon="📨" title="広告確認" subtitle="元付業者から承諾を取得"
                count={(byStatus.get("AD_PENDING") ?? []).length + (byStatus.get("AD_SENT") ?? []).length}
                urgent color="#e65100" bg="#fff3e0"
                properties={[...(byStatus.get("AD_PENDING") ?? []), ...(byStatus.get("AD_SENT") ?? [])].slice(0, 5).map<TaskCardProperty>(p => ({
                  id: p.id, label: `${p.city}${p.town ?? ""}`,
                  sub: p.status === "AD_SENT"
                    ? `送付済み${(() => { const d = daysSince(p.ad_confirmation_sent_at); return d !== null ? `（${d}日経過）` : ""; })()}`
                    : "送付待ち",
                }))}
                href="/admin/properties?status=AD_PENDING"
              />
            )}
            {(roleTab === "all" || roleTab === "backoffice") && (
              <TaskCard step={3} icon="🔧" title="掲載準備" subtitle="広告OK → 写真・原稿 → 掲載"
                count={(byStatus.get("AD_OK") ?? []).length + (byStatus.get("PHOTO_NEEDED") ?? []).length + (byStatus.get("PUBLISHING") ?? []).length}
                urgent={(byStatus.get("AD_OK") ?? []).length > 0}
                color="#1565c0" bg="#e3f2fd"
                properties={[...(byStatus.get("AD_OK") ?? []), ...(byStatus.get("PHOTO_NEEDED") ?? []), ...(byStatus.get("PUBLISHING") ?? [])].slice(0, 5).map<TaskCardProperty>(p => ({
                  id: p.id, label: `${p.city}${p.town ?? ""}`,
                  sub: p.status === "AD_OK" ? "広告OK・準備待ち" : p.status === "PHOTO_NEEDED" ? "写真待ち" : "掲載設定中",
                }))}
                href="/admin/properties?status=AD_OK"
              />
            )}
            {(roleTab === "all" || roleTab === "backoffice") && (
              <TaskCard step={4} icon="📷" title="掲載中管理" subtitle="掲載中物件の写真・品質管理"
                count={publishedPhotoAlert.length}
                urgent={publishedPhotoAlert.some(p => (p._count?.images ?? p.photo_count ?? 0) === 0)}
                color="#6a1b9a" bg="#f3e5f5"
                properties={publishedPhotoAlert.slice(0, 5).map<TaskCardProperty>(p => ({
                  id: p.id, label: `${p.city}${p.town ?? ""}`,
                  sub: (p._count?.images ?? p.photo_count ?? 0) === 0 ? "写真なし" : `写真${p._count?.images ?? p.photo_count ?? 0}枚（5枚必要）`,
                }))}
                href="/admin/properties?status=PUBLISHED"
              />
            )}
            {(roleTab === "all" || roleTab === "sales") && (
              <TaskCard step={5} icon="🔍" title="物件確認" subtitle="30日超 未チェック物件"
                count={adCheckOverdue.length} urgent={adCheckOverdue.length > 0}
                color="#4527a0" bg="#ede7f6"
                properties={adCheckOverdue.slice(0, 5).map<TaskCardProperty>(p => {
                  const days = daysSince(p.last_ad_check_date);
                  return { id: p.id, label: `${p.city}${p.town ?? ""}`, sub: days === null ? "未チェック" : `${days}日経過` };
                })}
                href="/admin/properties?status=PUBLISHED"
              />
            )}
            {(roleTab === "all" || roleTab === "sales") && (
              <TaskCard step={6} icon="🔔" title="物件終了" subtitle="成約アラート → 掲載終了"
                count={(byStatus.get("SOLD_ALERT") ?? []).length}
                urgent={(byStatus.get("SOLD_ALERT") ?? []).length > 0}
                color="#b71c1c" bg="#fce4ec"
                properties={(byStatus.get("SOLD_ALERT") ?? []).slice(0, 5).map<TaskCardProperty>(p => ({
                  id: p.id, label: `${p.city}${p.town ?? ""}`, sub: `${p.price.toLocaleString()}万円`,
                }))}
                href="/admin/properties?status=SOLD_ALERT"
              />
            )}
          </div>
        </div>
      )}

      {/* ワークフロー状況 — カンバン */}
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a" }}>ワークフロー状況</h2>
        <Link href="/admin/properties" style={{ fontSize: 12, color: "#706e68", textDecoration: "none" }}>全物件一覧 →</Link>
      </div>

      {loadingProps ? (
        <div style={{ color: "#aaa", fontSize: 13, padding: 24 }}>読み込み中...</div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 }}>
          {(KANBAN_COLUMNS_GROUPED ?? []).map(col => {
            const items = (col.statuses ?? []).flatMap(s => byStatus.get(s) ?? []);
            return (
              <div key={col.key} style={{ flexShrink: 0, width: 195, background: "#fff", borderRadius: 10, border: "1px solid #e0deda", overflow: "hidden" }}>
                <div style={{ background: col.bg, padding: "9px 12px", borderBottom: "1px solid #e0deda", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.icon} {col.label}</span>
                  <span style={{ fontSize: 11, background: col.color, color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>{items.length}</span>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 440, overflowY: "auto" }}>
                  {items.length === 0 && (
                    <div style={{ color: "#ccc", fontSize: 11, textAlign: "center", padding: "12px 0" }}>なし</div>
                  )}
                  {items.slice(0, 8).map(p => {
                    const photoCount = p._count?.images ?? p.photo_count ?? 0;
                    const sentDays   = daysSince(p.ad_confirmation_sent_at);
                    const isOverdue  = p.status === "AD_SENT" && sentDays !== null && sentDays >= 3;
                    const statusDef  = getStatusDef(p.status);
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
                            {(col.statuses ?? []).length > 1 && (
                              <span style={{ fontSize: 9, background: statusDef.bg, color: statusDef.color, padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>{statusDef.icon} {statusDef.label}</span>
                            )}
                            {photoCount === 0 && !["DRAFT", "AD_PENDING", "AD_SENT"].includes(p.status) && (
                              <span title="写真が登録されていません" style={{ fontSize: 9, background: "#fdeaea", color: "#8c1f1f", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>📷なし</span>
                            )}
                            {photoCount > 0 && (
                              <span style={{ fontSize: 9, color: "#888" }}>📷{photoCount}</span>
                            )}
                            {isOverdue && (
                              <span title={`広告確認書を送付してから${sentDays}日経過しています`} style={{ fontSize: 9, background: "#fff0e0", color: "#e65100", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>⚠️{sentDays}日</span>
                            )}
                            {(p.pending_tasks ?? []).length > 0 && (
                              <span title={`未完了タスク: ${(p.pending_tasks ?? []).join(", ")}`} style={{ fontSize: 9, color: "#8c1f1f" }}>❌{(p.pending_tasks ?? []).length}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {items.length > 8 && (
                    <Link href={`/admin/properties?status=${(col.statuses ?? [])[0] ?? ""}`} style={{ fontSize: 10, color: "#888", textAlign: "center", textDecoration: "none", padding: "4px 0" }}>
                      …他{items.length - 8}件
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 営業向けパネル */}
      {!loadingProps && roleTab === "sales" && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 12 }}>営業向け — 対応が必要な物件</h2>
          {salesAlerts.length === 0 && salesActionRequired.length === 0 ? (
            <div style={{ background: "#e8f5e9", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#1b5e20" }}>✅ 現在、営業対応が必要な物件はありません。</div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8f6f3" }}>
                    {["物件", "ステータス", "未完了タスク", ""].map(h => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#888", borderBottom: "1px solid #e8e4e0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...(salesAlerts ?? []), ...(salesActionRequired ?? []).filter(p => !(salesAlerts ?? []).includes(p))].slice(0, 15).map(p => {
                    const def = getStatusDef(p.status);
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f2f1ed" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 500 }}>{p.city}{p.town ?? ""}</div>
                          <div style={{ color: "#888", fontSize: 11 }}>{p.price.toLocaleString()}万円</div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: def.bg, color: def.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{def.icon} {def.label}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(p.pending_tasks ?? []).slice(0, 2).map(t => (
                              <span key={t} style={{ fontSize: 10, background: "#fdeaea", color: "#8c1f1f", padding: "1px 6px", borderRadius: 4 }}>❌ {t}</span>
                            ))}
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
          )}
        </div>
      )}

      {/* 内勤向けパネル */}
      {!loadingProps && roleTab === "backoffice" && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 12 }}>内勤向け — 書類・写真・掲載管理</h2>
          {backofficeTasks.length === 0 ? (
            <div style={{ background: "#e8f5e9", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#1b5e20" }}>✅ 現在、内勤対応が必要な物件はありません。</div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8f6f3" }}>
                    {["物件", "ステータス", "課題", ""].map(h => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#888", borderBottom: "1px solid #e8e4e0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(backofficeTasks ?? []).slice(0, 15).map(p => {
                    const def        = getStatusDef(p.status);
                    const photoCount = p._count?.images ?? p.photo_count ?? 0;
                    const sentDays   = daysSince(p.ad_confirmation_sent_at);
                    const issues: string[] = [];
                    if (photoCount === 0) issues.push("写真なし");
                    else if (photoCount < 5) issues.push(`写真${photoCount}枚（5枚必要）`);
                    if (sentDays !== null && sentDays >= 3) issues.push(`確認書返信待ち${sentDays}日`);
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f2f1ed" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 500 }}>{p.city}{p.town ?? ""}</div>
                          <div style={{ color: "#888", fontSize: 11 }}>{p.price.toLocaleString()}万円</div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: def.bg, color: def.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{def.icon} {def.label}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {issues.map(i => (
                              <span key={i} style={{ fontSize: 10, background: "#fff8e1", color: "#8a5200", padding: "1px 6px", borderRadius: 4 }}>⚠️ {i}</span>
                            ))}
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
          )}
        </div>
      )}

      {/* 要対応物件 */}
      {!loadingProps && roleTab === "all" && actionRequired.length > 0 && (
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
                {(actionRequired ?? []).slice(0, 10).map(p => {
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
                          {(p.pending_tasks ?? []).length > 3 && (
                            <span style={{ fontSize: 10, color: "#888" }}>…他{(p.pending_tasks ?? []).length - 3}件</span>
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

// ── Export: ErrorBoundary wraps the inner dashboard ───────────────────────────
export default function AdminDashboardClient() {
  return (
    <ErrorBoundary>
      <DashboardInner />
    </ErrorBoundary>
  );
}
