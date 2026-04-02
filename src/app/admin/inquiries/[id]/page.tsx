"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InquiryDetail {
  id: string;
  source: string;
  received_at: string;
  inquiry_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_tel: string | null;
  customer_address: string | null;
  property_name: string | null;
  property_number: string | null;
  message: string | null;
  visit_hope: boolean;
  document_hope: boolean;
  priority: string;
  ai_score: number | null;
  ai_notes: string | null;
  status: string;
  internal_memo: string | null;
  assigned_to: string | null;
  assignment_reason: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  assigned_staff: { id: string; name: string; permission: string } | null;
  property: { id: string; property_number: string | null; city: string; town: string | null; price: number; status: string } | null;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  activities: { id: string; type: string; content: string; created_at: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "未対応", CONTACTED: "連絡済", VISITING: "内見調整中",
  NEGOTIATING: "商談中", CLOSED: "完了", LOST: "失注",
};
const PRIORITY_ICON: Record<string, string> = { HIGH: "🔴", NORMAL: "🟡", LOW: "🟢" };
const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOMES", HP: "自社HP", TEL: "電話", WALK_IN: "来店", OTHER: "その他",
};

const inp: React.CSSProperties = { border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const section: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 14 };

export default function InquiryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [allStaff, setAllStaff] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/inquiries/${params.id}`)
      .then(r => r.json())
      .then((d: { inquiry?: InquiryDetail }) => {
        if (!d.inquiry) return;
        setInquiry(d.inquiry);
        setStatus(d.inquiry.status);
        setMemo(d.inquiry.internal_memo ?? "");
        setSelectedStaff(d.inquiry.assigned_to ?? "");
      })
      .catch(() => {});
    fetch("/api/staff?active=true")
      .then(r => r.json())
      .then((d: { staff?: { id: string; name: string }[] }) => setAllStaff(d.staff ?? []))
      .catch(() => {});
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/inquiries/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internal_memo: memo }),
      });
      setMsg("保存しました");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await fetch(`/api/inquiries/${params.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaff }),
      });
      setMsg("担当者を変更しました");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("担当者変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!inquiry) return <div style={{ padding: 40, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800 }}>
      <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "inherit" }}>← 反響一覧</button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>{PRIORITY_ICON[inquiry.priority] ?? "⚪"}</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{inquiry.customer_name ?? "氏名未取得"} 様</h1>
        <span style={{ background: "#f7f6f2", padding: "3px 12px", borderRadius: 12, fontSize: 13 }}>{SOURCE_LABELS[inquiry.source] ?? inquiry.source}</span>
        <span style={{ fontSize: 13, color: "#888" }}>{new Date(inquiry.received_at).toLocaleString("ja-JP")}</span>
      </div>

      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Left column */}
        <div>
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>顧客情報</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "#888" }}>氏名:</span> {inquiry.customer_name ?? "—"}</div>
              <div><span style={{ color: "#888" }}>電話:</span> {inquiry.customer_tel ?? "—"}</div>
              <div><span style={{ color: "#888" }}>メール:</span> {inquiry.customer_email ?? "—"}</div>
              <div><span style={{ color: "#888" }}>住所:</span> {inquiry.customer_address ?? "—"}</div>
              {inquiry.customer && (
                <a href={`/admin/customers/${inquiry.customer.id}`} style={{ fontSize: 12, color: "#8c1f1f", marginTop: 4 }}>顧客台帳を見る →</a>
              )}
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>問い合わせ物件</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "#888" }}>物件:</span> {inquiry.property_name ?? "—"}</div>
              <div><span style={{ color: "#888" }}>物件番号:</span> {inquiry.property_number ?? "—"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {inquiry.visit_hope && <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "2px 10px", borderRadius: 8, fontSize: 12 }}>内見希望</span>}
                {inquiry.document_hope && <span style={{ background: "#f3e5f5", color: "#6a1b9a", padding: "2px 10px", borderRadius: 8, fontSize: 12 }}>資料希望</span>}
              </div>
              {inquiry.property && (
                <a href={`/admin/properties/${inquiry.property.id}`} style={{ fontSize: 12, color: "#8c1f1f", marginTop: 4 }}>物件詳細を見る →</a>
              )}
            </div>
          </div>

          {inquiry.message && (
            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>メッセージ</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{inquiry.message}</div>
            </div>
          )}

          {inquiry.ai_notes && (
            <div style={{ ...section, background: "#fffde7", borderColor: "#fbc02d" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🤖 AI分析</div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                購入確度スコア: <strong style={{ fontSize: 18, color: (inquiry.ai_score ?? 0) >= 70 ? "#c62828" : "#3a2a1a" }}>{inquiry.ai_score ?? "—"}</strong> / 100
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>{inquiry.ai_notes}</div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>対応状況</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={lbl}>ステータス</label>
                <select style={inp} value={status} onChange={e => setStatus(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>内部メモ</label>
                <textarea style={{ ...inp, resize: "vertical" }} rows={4} value={memo} onChange={e => setMemo(e.target.value)} placeholder="対応状況・メモ..." />
              </div>
              <button onClick={() => void handleSave()} disabled={saving}
                style={{ padding: "9px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>担当者</div>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              現在: <strong>{inquiry.assigned_staff?.name ?? "未振り分け"}</strong>
              {inquiry.assigned_by && <span style={{ color: "#888", marginLeft: 8 }}>（{inquiry.assigned_by === "AI" ? "AI自動" : "手動"}振り分け）</span>}
            </div>
            {inquiry.assignment_reason && <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{inquiry.assignment_reason}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...inp, flex: 1 }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                <option value="">担当者を選択</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={() => void handleAssign()} disabled={!selectedStaff || saving}
                style={{ padding: "8px 14px", borderRadius: 8, background: "#1565c0", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                変更
              </button>
            </div>
          </div>

          {inquiry.activities.length > 0 && (
            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>対応履歴</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inquiry.activities.map(a => (
                  <div key={a.id} style={{ fontSize: 12, borderLeft: "2px solid #e0deda", paddingLeft: 10 }}>
                    <div style={{ color: "#888" }}>{new Date(a.created_at).toLocaleString("ja-JP")}</div>
                    <div>{a.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
