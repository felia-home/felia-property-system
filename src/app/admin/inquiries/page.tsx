"use client";
import { useEffect, useState, useCallback } from "react";

interface InquiryItem {
  id: string;
  source: string;
  received_at: string;
  inquiry_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_tel: string | null;
  property_name: string | null;
  property_number: string | null;
  message: string | null;
  visit_hope: boolean;
  document_hope: boolean;
  priority: string;
  ai_score: number | null;
  ai_notes: string | null;
  status: string;
  assigned_staff: { id: string; name: string } | null;
  property: { id: string; property_number: string | null; city: string; town: string | null } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOMES", HP: "自社HP", TEL: "電話", WALK_IN: "来店", OTHER: "その他",
};
const STATUS_LABELS: Record<string, string> = {
  NEW: "未対応", CONTACTED: "連絡済", VISITING: "内見調整中",
  NEGOTIATING: "商談中", CLOSED: "完了", LOST: "失注",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEW: { bg: "#ffebee", color: "#c62828" },
  CONTACTED: { bg: "#fff8e1", color: "#f57f17" },
  VISITING: { bg: "#e3f2fd", color: "#1565c0" },
  NEGOTIATING: { bg: "#f3e5f5", color: "#6a1b9a" },
  CLOSED: { bg: "#e8f5e9", color: "#2e7d32" },
  LOST: { bg: "#f5f5f5", color: "#757575" },
};
const PRIORITY_ICON: Record<string, string> = { HIGH: "🔴", NORMAL: "🟡", LOW: "🟢" };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterSource !== "ALL") params.set("source", filterSource);
      if (filterPriority !== "ALL") params.set("priority", filterPriority);
      const res = await fetch(`/api/inquiries?${params}`);
      const d = await res.json() as { inquiries?: InquiryItem[]; statusCounts?: Record<string, number> };
      setInquiries(d.inquiries ?? []);
      setStatusCounts(d.statusCounts ?? {});
    } catch {
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSource, filterPriority]);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/inquiries/sync", { method: "POST" });
      const d = await res.json() as { imported?: number; skipped?: number; errors?: number; error?: string };
      if (d.error) {
        setSyncMsg(`❌ ${d.error}`);
      } else {
        setSyncMsg(`✅ ${d.imported}件取込完了（スキップ: ${d.skipped}件）`);
        await load();
      }
    } catch {
      setSyncMsg("❌ 取込に失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  const inp: React.CSSProperties = { border: "1px solid #e0deda", borderRadius: 7, padding: "7px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff" };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>反響管理</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {syncMsg && <span style={{ fontSize: 13, color: syncMsg.startsWith("✅") ? "#2e7d32" : "#c62828" }}>{syncMsg}</span>}
          <button onClick={() => void handleSync()} disabled={syncing}
            style={{ padding: "8px 18px", borderRadius: 8, background: syncing ? "#aaa" : "#1565c0", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer" }}>
            {syncing ? "取込中..." : "📧 今すぐ取込"}
          </button>
          <a href="/admin/inquiries/new"
            style={{ padding: "8px 18px", borderRadius: 8, background: "#8c1f1f", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            + 手動登録
          </a>
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {(["NEW", "CONTACTED", "VISITING", "NEGOTIATING", "CLOSED", "LOST"] as const).map(s => (
          <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "ALL" : s)}
            style={{ ...STATUS_COLORS[s], padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: filterStatus !== "ALL" && filterStatus !== s ? 0.4 : 1 }}>
            {STATUS_LABELS[s]}: {statusCounts[s] ?? 0}件
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select style={inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">全ステータス</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select style={inp} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="ALL">全ポータル</option>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select style={inp} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="ALL">全優先度</option>
          <option value="HIGH">🔴 HIGH</option>
          <option value="NORMAL">🟡 NORMAL</option>
          <option value="LOW">🟢 LOW</option>
        </select>
        <button onClick={() => void load()} style={{ ...inp, cursor: "pointer", background: "#f7f6f2" }}>更新</button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: "#aaa", padding: 40, textAlign: "center" }}>読み込み中...</div>
      ) : inquiries.length === 0 ? (
        <div style={{ color: "#aaa", padding: 40, textAlign: "center", background: "#fff", borderRadius: 12, border: "1px solid #e0deda" }}>
          反響はありません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inquiries.map(inq => (
            <div key={inq.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${inq.priority === "HIGH" ? "#f5c6c6" : "#e0deda"}`, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{PRIORITY_ICON[inq.priority] ?? "⚪"}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{inq.customer_name ?? "氏名未取得"} 様</span>
                  <span style={{ background: "#f7f6f2", padding: "2px 10px", borderRadius: 10, fontSize: 12 }}>{SOURCE_LABELS[inq.source] ?? inq.source}</span>
                  <span style={{ ...(STATUS_COLORS[inq.status] ?? { bg: "#f5f5f5", color: "#757575" }), padding: "2px 10px", borderRadius: 10, fontSize: 12 }}>{STATUS_LABELS[inq.status] ?? inq.status}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{timeAgo(inq.received_at)}</span>
                </div>
                <a href={`/admin/inquiries/${inq.id}`} style={{ fontSize: 13, color: "#8c1f1f", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 10 }}>詳細 →</a>
              </div>

              {(inq.property_number ?? inq.property_name ?? inq.property) && (
                <div style={{ fontSize: 13, color: "#5a4a3a", marginTop: 6 }}>
                  📍 {inq.property ? `${inq.property.city}${inq.property.town ?? ""}` : ""}{inq.property_name ? ` ${inq.property_name}` : ""}{inq.property_number ? ` (${inq.property_number})` : ""}
                  {inq.visit_hope && <span style={{ marginLeft: 8, background: "#e3f2fd", color: "#1565c0", padding: "1px 8px", borderRadius: 8, fontSize: 11 }}>内見希望</span>}
                  {inq.document_hope && <span style={{ marginLeft: 4, background: "#f3e5f5", color: "#6a1b9a", padding: "1px 8px", borderRadius: 8, fontSize: 11 }}>資料希望</span>}
                </div>
              )}

              {inq.message && (
                <div style={{ fontSize: 13, color: "#3a2a1a", marginTop: 6, fontStyle: "italic" }}>
                  「{inq.message.slice(0, 100)}{inq.message.length > 100 ? "…" : ""}」
                </div>
              )}

              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#888" }}>
                {inq.ai_score !== null && <span>AIスコア: <strong style={{ color: (inq.ai_score ?? 0) >= 70 ? "#c62828" : "#3a2a1a" }}>{inq.ai_score}</strong></span>}
                <span>担当: <strong>{inq.assigned_staff?.name ?? "未振り分け"}</strong></span>
                {inq.customer_tel && <span>📞 {inq.customer_tel}</span>}
                {inq.customer_email && <span>✉ {inq.customer_email}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
