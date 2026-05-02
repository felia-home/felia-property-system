"use client";
import { useState, useEffect, useCallback } from "react";

interface KpiData {
  period: { year: number; month: number };
  inquiries: {
    thisMonth: number; prevMonth: number; diff: number;
    bySource: { source: string; count: number }[];
  };
  conversion: {
    totalNew: number; contacted: number; visiting: number;
    contactRate: number; visitRate: number;
  };
  staffKpi: {
    name: string; calls: number; emails: number;
    visits: number; assigned: number; overdue: number; total: number;
  }[];
}

const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo!不動産",
  HOMES: "LIFULL HOME'S", HP: "自社HP", HP_MEMBER: "自社HP会員",
  TEL: "電話", VISIT: "来店", WALK_IN: "来店", OTHER: "その他",
};

export default function KpiReportPage() {
  const [data, setData]       = useState<KpiData | null>(null);
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
        ...(storeId ? { store_id: storeId } : {}),
      });
      const res = await fetch(`/api/admin/reports/kpi?${params}`);
      setData(await res.json());
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

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>📈 KPIレポート</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>担当者別アクション数・転換率の分析</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>読み込み中...</div>
      ) : !data ? null : (
        <>
          {/* 反響KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              {
                label: "今月の反響",   value: `${data.inquiries.thisMonth}件`,
                sub: `前月比 ${data.inquiries.diff >= 0 ? "+" : ""}${data.inquiries.diff}件`,
                color: "#1d4ed8", bg: "#eff6ff",
              },
              {
                label: "接触率",       value: `${data.conversion.contactRate}%`,
                sub: `${data.conversion.contacted}/${data.conversion.totalNew}件`,
                color: "#166534", bg: "#f0fdf4",
              },
              {
                label: "内見転換率",   value: `${data.conversion.visitRate}%`,
                sub: `${data.conversion.visiting}/${data.conversion.contacted}件`,
                color: "#92400e", bg: "#fffbeb",
              },
            ].map(card => (
              <div key={card.label} style={{
                padding: "16px 20px", borderRadius: 10,
                background: card.bg, border: `1px solid ${card.color}22`,
              }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: "bold", color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* 媒体別 */}
          <div style={{
            padding: 20, background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>📡 媒体別反響数（今月）</div>
            {data.inquiries.bySource.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {data.inquiries.bySource.sort((a, b) => b.count - a.count).map(s => (
                  <div key={s.source} style={{
                    padding: "10px 16px", borderRadius: 6,
                    background: "#f9fafb", border: "1px solid #e5e7eb",
                    minWidth: 120, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{SOURCE_LABELS[s.source] ?? s.source}</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", color: "#374151", marginTop: 4 }}>{s.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 担当者別KPI */}
          <div style={{
            padding: 20, background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>👥 担当者別アクション数</div>
            {data.staffKpi.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>データなし</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    {["担当者", "📞 電話", "📧 メール", "🏠 内見", "反響担当", "⚠️ 未対応", "合計"].map(h => (
                      <th key={h} style={{
                        padding: "10px 12px",
                        textAlign: h === "担当者" ? "left" : "right",
                        fontWeight: "bold", color: "#6b7280", fontSize: 12,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staffKpi.map(s => (
                    <tr key={s.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{s.name}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.calls}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.emails}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.visits}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.assigned}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {s.overdue > 0 ? (
                          <span style={{ color: "#dc2626", fontWeight: "bold" }}>⚠️ {s.overdue}</span>
                        ) : (
                          <span style={{ color: "#16a34a" }}>✅ 0</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold" }}>{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
