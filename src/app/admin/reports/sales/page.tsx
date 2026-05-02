"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  NEW:         "新規問合せ",
  CONTACTED:   "接触済み",
  CONTACTING:  "接触中",
  VISITING:    "内見段階",
  NEGOTIATING: "交渉中",
  CONTRACT:    "契約済み",
  CLOSED:      "完了",
  LOST:        "失注",
  PENDING:     "保留",
};

const STATUS_COLORS: Record<string, string> = {
  NEW:         "#6b7280",
  CONTACTED:   "#3b82f6",
  CONTACTING:  "#3b82f6",
  VISITING:    "#f59e0b",
  NEGOTIATING: "#ef4444",
  CONTRACT:    "#8b5cf6",
  CLOSED:      "#22c55e",
  LOST:        "#9ca3af",
  PENDING:     "#f97316",
};

interface DashboardData {
  today: {
    contacts: { id: string; name: string; next_contact_at: string; next_contact_note: string | null; priority: string; assigned: { name: string } | null }[];
    visits:   { id: string; scheduled_at: string; customer: { name: string } | null; property: { building_name: string | null; city: string | null } | null; staff: { name: string } | null }[];
    overdue:  { id: string; name: string; next_contact_at: string; priority: string; assigned: { name: string } | null }[];
  };
  alerts: {
    overdueCount: number;
    todayCount:   number;
    visitsCount:  number;
    noContact:    { id: string; name: string; last_contact_at: string | null; assigned: { name: string } | null }[];
  };
  pipeline:  { status: string; count: number }[];
  staffList: { id: string; name: string; overdueCount: number }[];
}

export default function SalesDashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [stores, setStores]   = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(storeId ? { store_id: storeId } : {}),
      });
      const res  = await fetch(`/api/admin/reports/sales-dashboard?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/branches").then(r => r.json()).then(d => {
      setStores([{ id: "", name: "全店舗" }, ...(d.branches ?? [])]);
    }).catch(() => setStores([{ id: "", name: "全店舗" }]));
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const daysSince = (d: string | null) => {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>🎯 営業ダッシュボード</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={storeId} onChange={e => setStoreId(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()}
            style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            🔄 更新
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>読み込み中...</div>
      ) : !data ? null : (
        <>
          {data.alerts.overdueCount > 0 && (
            <div style={{
              padding: "12px 16px", marginBottom: 20,
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <span style={{ fontSize: 13, color: "#dc2626", fontWeight: "bold" }}>
                期限超過の顧客が {data.alerts.overdueCount} 件あります。早急に対応してください。
              </span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "🔴 期限超過",    value: data.alerts.overdueCount, color: "#dc2626", bg: "#fef2f2" },
              { label: "📞 今日の予定",  value: data.alerts.todayCount,   color: "#d97706", bg: "#fffbeb" },
              { label: "🏠 今日の内見",  value: data.alerts.visitsCount,  color: "#2563eb", bg: "#eff6ff" },
              { label: "⚠️ 3日未連絡",  value: data.alerts.noContact.length, color: "#7c3aed", bg: "#faf5ff" },
            ].map(card => (
              <div key={card.label} style={{
                padding: "16px 20px", borderRadius: 10,
                background: card.bg, border: `1px solid ${card.color}33`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: "bold", color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
            <div>
              {data.today.overdue.length > 0 && (
                <div style={{ padding: 20, background: "#fff", border: "1px solid #fca5a5", borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#dc2626", marginBottom: 12 }}>
                    🔴 今すぐ対応（期限超過）
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.today.overdue.map(c => (
                      <div key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", background: "#fef2f2",
                        border: "1px solid #fecaca", borderRadius: 8,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            予定: {formatDate(c.next_contact_at)} ・ 担当: {c.assigned?.name ?? "未割当"}
                          </div>
                        </div>
                        <Link href={`/admin/customers/${c.id}`} style={{
                          padding: "5px 12px", borderRadius: 6, fontSize: 12,
                          background: "#dc2626", color: "#fff", textDecoration: "none", fontWeight: "bold",
                        }}>
                          対応する
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>
                  📞 今日の予定連絡 ({data.today.contacts.length}件)
                </div>
                {data.today.contacts.length === 0 ? (
                  <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>
                    今日の予定はありません ✨
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.today.contacts.map(c => (
                      <div key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", background: "#fffbeb",
                        border: "1px solid #fde68a", borderRadius: 8,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {formatDate(c.next_contact_at)} ・ {c.next_contact_note ?? ""}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            担当: {c.assigned?.name ?? "未割当"}
                          </div>
                        </div>
                        <Link href={`/admin/customers/${c.id}`} style={{
                          padding: "5px 12px", borderRadius: 6, fontSize: 12,
                          background: "#f59e0b", color: "#fff", textDecoration: "none",
                        }}>詳細</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {data.today.visits.length > 0 && (
                <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>
                    🏠 今日の内見予定 ({data.today.visits.length}件)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.today.visits.map(v => (
                      <div key={v.id} style={{
                        padding: "10px 12px", background: "#eff6ff",
                        border: "1px solid #bfdbfe", borderRadius: 8,
                      }}>
                        <div style={{ fontWeight: "bold", fontSize: 13 }}>
                          {new Date(v.scheduled_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                          　{v.customer?.name ?? "顧客不明"}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                          {v.property?.building_name || v.property?.city} ・ 担当: {v.staff?.name ?? "未割当"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.alerts.noContact.length > 0 && (
                <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12, color: "#7c3aed" }}>
                    ⚠️ 3日以上未連絡 ({data.alerts.noContact.length}件)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.alerts.noContact.slice(0, 10).map(c => {
                      const days = daysSince(c.last_contact_at);
                      return (
                        <div key={c.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", background: "#faf5ff",
                          border: "1px solid #e9d5ff", borderRadius: 8,
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: "bold", fontSize: 13 }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: "#7c3aed", marginLeft: 8 }}>
                              {days !== null ? `${days}日前` : "未連絡"}
                            </span>
                            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                              担当: {c.assigned?.name ?? "未割当"}
                            </span>
                          </div>
                          <Link href={`/admin/customers/${c.id}`} style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11,
                            background: "#7c3aed", color: "#fff", textDecoration: "none",
                          }}>確認</Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>📊 顧客パイプライン</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.pipeline.sort((a, b) => b.count - a.count).map(p => (
                    <div key={p.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ minWidth: 80, fontSize: 11, color: STATUS_COLORS[p.status] ?? "#6b7280", fontWeight: "bold" }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                      <div style={{ flex: 1, height: 16, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, p.count * 5)}%`,
                          background: STATUS_COLORS[p.status] ?? "#9ca3af",
                          borderRadius: 4,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: "bold", minWidth: 30, textAlign: "right" }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>
                  👥 スタッフ別 未対応件数
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.staffList.map(s => (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", background: "#f9fafb", borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                      {s.overdueCount > 0 ? (
                        <span style={{ padding: "2px 8px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: "bold" }}>
                          ⚠️ {s.overdueCount}件
                        </span>
                      ) : (
                        <span style={{ padding: "2px 8px", borderRadius: 8, background: "#f0fdf4", color: "#166534", fontSize: 12 }}>
                          ✅ 問題なし
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
