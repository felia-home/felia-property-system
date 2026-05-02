"use client";
import { useState, useEffect, useCallback } from "react";

const SOURCE_LABELS: Record<string, string> = {
  SUUMO:     "SUUMO",
  ATHOME:    "athome",
  YAHOO:     "Yahoo!不動産",
  HP:        "自社HP",
  HP_MEMBER: "自社HP会員",
  TEL:       "電話",
  VISIT:     "来店",
  OTHER:     "その他",
};

const SOURCE_COLORS: Record<string, string> = {
  SUUMO:     "#ef4444",
  ATHOME:    "#f97316",
  YAHOO:     "#a855f7",
  HP:        "#22c55e",
  HP_MEMBER: "#16a34a",
  TEL:       "#3b82f6",
  VISIT:     "#06b6d4",
  OTHER:     "#9ca3af",
};

interface ReportData {
  total: number;
  bySource: { source: string; count: number }[];
  byStore:  { store_id: string; count: number }[];
  byType:   { type: string; count: number }[];
  byProperty: { property_name: string | null; property_number: string | null; count: number }[];
  byStaff:  { name: string; count: number }[];
  daily:    Record<string, Record<string, number>>;
  statusCounts: { status: string; count: number }[];
  avgResponseTime: number;
}

export default function InquiryReportPage() {
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [month, setMonth]     = useState(new Date().getMonth() + 1);
  const [storeId, setStoreId] = useState("");
  const [stores, setStores]   = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year:  String(year),
        month: String(month),
        period: "month",
        ...(storeId ? { store_id: storeId } : {}),
      });
      const res  = await fetch(`/api/admin/reports/inquiry?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [year, month, storeId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/branches").then(r => r.json()).then(d => {
      setStores([{ id: "", name: "全店舗" }, ...(d.branches ?? [])]);
    }).catch(() => setStores([{ id: "", name: "全店舗" }]));
  }, []);

  const totalContacted = data?.statusCounts
    .filter(s => !["NEW"].includes(s.status))
    .reduce((a, b) => a + b.count, 0) ?? 0;
  const contactRate = data?.total
    ? Math.round((totalContacted / data.total) * 100) : 0;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>📊 反響レポート</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            媒体別・店舗別の反響状況を分析します
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={storeId} onChange={e => setStoreId(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
          <a
            href={`/api/admin/reports/inquiry/export?year=${year}&month=${month}${storeId ? `&store_id=${storeId}` : ""}`}
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #d1d5db", background: "#fff",
              color: "#374151", textDecoration: "none", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📥 CSVエクスポート
          </a>
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/admin/reports/generate", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ type: "MONTHLY", year, month, store_id: storeId || undefined }),
              });
              const json = await res.json();
              alert(json.ok ? "月次レポートを生成しました" : "生成に失敗しました");
            }}
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #bfdbfe", background: "#eff6ff",
              color: "#1d4ed8", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            📋 月次レポート生成
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>読み込み中...</div>
      ) : !data ? null : (
        <>
          {/* KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "総反響数",     value: `${data.total}件`,            color: "#1d4ed8", bg: "#eff6ff" },
              { label: "接触率",       value: `${contactRate}%`,           color: "#166534", bg: "#f0fdf4" },
              { label: "平均応答時間", value: `${data.avgResponseTime}分`, color: "#92400e", bg: "#fffbeb" },
              { label: "問合せ物件数", value: `${data.byProperty.length}件`, color: "#7c3aed", bg: "#faf5ff" },
            ].map(card => (
              <div key={card.label} style={{
                padding: "16px 20px", borderRadius: 10,
                background: card.bg, border: `1px solid ${card.color}22`,
              }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: "bold", color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* 媒体別 + 物件ランキング */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>📡 媒体別反響数</div>
              {data.bySource.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.bySource.sort((a, b) => b.count - a.count).map(s => {
                    const pct = data.total ? Math.round((s.count / data.total) * 100) : 0;
                    const color = SOURCE_COLORS[s.source] ?? "#9ca3af";
                    return (
                      <div key={s.source}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                          <span style={{ fontWeight: "bold", color }}>{SOURCE_LABELS[s.source] ?? s.source}</span>
                          <span>{s.count}件 ({pct}%)</span>
                        </div>
                        <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>🏠 問合せ物件ランキング</div>
              {data.byProperty.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.byProperty.slice(0, 8).map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f9fafb", borderRadius: 6 }}>
                      <span style={{
                        minWidth: 24, height: 24, borderRadius: "50%",
                        background: i < 3 ? ["#f59e0b", "#9ca3af", "#b45309"][i] : "#e5e7eb",
                        color: i < 3 ? "#fff" : "#6b7280",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: "bold",
                      }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: "bold", color: "#374151" }}>
                        {p.property_name || p.property_number || "不明"}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: "bold" }}>
                        {p.count}件
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 店舗別 + 担当者別 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>🏢 店舗別反響数</div>
              {data.byStore.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "bold", color: "#6b7280" }}>店舗</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", color: "#6b7280" }}>件数</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", color: "#6b7280" }}>割合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStore.map(s => (
                      <tr key={s.store_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 10px" }}>{s.store_id}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>{s.count}件</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#6b7280" }}>
                          {data.total ? Math.round((s.count / data.total) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>👤 担当者別反響数</div>
              {data.byStaff.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "bold", color: "#6b7280" }}>担当者</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold", color: "#6b7280" }}>件数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStaff.sort((a, b) => b.count - a.count).map(s => (
                      <tr key={s.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 10px" }}>{s.name}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>{s.count}件</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={{ padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>📋 問合せ種別</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {data.byType.map(t => (
                <div key={t.type} style={{ padding: "12px 20px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: "#374151" }}>{t.count}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{t.type}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
