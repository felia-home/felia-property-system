"use client";
import { useEffect, useState, useCallback } from "react";

const STATUS_LABELS: Record<string, string> = {
  lead: "見込み客", active: "商談中", contract: "契約済み", closed: "クローズ",
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  lead:     { background: "#f3f2ef", color: "#706e68" },
  active:   { background: "#e3f0ff", color: "#1a56a0" },
  contract: { background: "#234f35", color: "#fff" },
  closed:   { background: "#fdeaea", color: "#8c1f1f" },
};
const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOME'S", HP: "自社HP", TEL: "電話", WALK_IN: "来店", OTHER: "その他",
};
const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  HIGH:   { background: "#ffebee", color: "#c62828" },
  NORMAL: { background: "#fff8e1", color: "#e65100" },
  LOW:    { background: "#f5f5f5", color: "#616161" },
};
const PRIORITY_LABELS: Record<string, string> = { HIGH: "高", NORMAL: "普通", LOW: "低" };

interface Customer {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  property_type_pref: string | null;
  status: string;
  source: string | null;
  priority: string;
  ai_score: number | null;
  last_contacted_at: string | null;
  created_at: string;
  inquiries: { id: string; source: string; received_at: string; ai_score: number | null; property_name: string | null }[];
}

const INITIAL_FORM = {
  name: "", name_kana: "", email: "", phone: "",
  budget_min: "", budget_max: "", property_type_pref: "",
  rooms_pref: "", status: "lead", source: "", notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [error, setError] = useState("");

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (source) params.set("source", source);
    params.set("includeInquiries", "true");
    fetch(`/api/customers?${params}`)
      .then(r => r.json())
      .then(d => { setCustomers(d.customers ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, status, priority, source]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name) { setError("氏名は必須です"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget_min: form.budget_min ? Number(form.budget_min) : null,
          budget_max: form.budget_max ? Number(form.budget_max) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました"); return; }
      setShowForm(false); setForm(INITIAL_FORM); fetchCustomers();
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/inquiries/sync", { method: "POST" });
      const d = await res.json() as { imported?: number; skipped?: number; error?: string };
      if (d.error) setSyncMsg(`❌ ${d.error}`);
      else { setSyncMsg(`✅ ${d.imported}件取込`); fetchCustomers(); }
    } catch { setSyncMsg("❌ 取込エラー"); }
    finally { setSyncing(false); }
  };

  const inputSt: React.CSSProperties = { padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>顧客管理</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>問い合わせ・反響・商談中の顧客を一元管理</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {syncMsg && <span style={{ fontSize: 12, color: syncMsg.startsWith("✅") ? "#2e7d32" : "#c62828" }}>{syncMsg}</span>}
          <button onClick={handleSync} disabled={syncing}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: syncing ? "#888" : "#1565c0", color: "#fff", border: "none", cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {syncing ? "取込中..." : "📧 反響取込"}
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + 新規登録
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* New customer form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>顧客新規登録</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "氏名 *", k: "name", ph: "山田 太郎" },
              { label: "フリガナ", k: "name_kana", ph: "ヤマダ タロウ" },
              { label: "メールアドレス", k: "email", ph: "yamada@example.com" },
              { label: "電話番号", k: "phone", ph: "090-0000-0000" },
              { label: "予算下限（万円）", k: "budget_min", ph: "5000" },
              { label: "予算上限（万円）", k: "budget_max", ph: "8000" },
              { label: "希望間取り", k: "rooms_pref", ph: "3LDK以上" },
              { label: "問い合わせ経路", k: "source", ph: "HP・SUUMO・紹介など" },
            ].map(({ label, k, ph }) => (
              <div key={k}>
                <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setF(k, e.target.value)} placeholder={ph} style={inputSt} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>希望物件種別</label>
              <select value={form.property_type_pref} onChange={e => setF("property_type_pref", e.target.value)} style={inputSt}>
                <option value="">指定なし</option>
                <option value="USED_HOUSE">中古戸建</option>
                <option value="NEW_HOUSE">新築戸建</option>
                <option value="MANSION">マンション</option>
                <option value="LAND">土地</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>ステータス</label>
              <select value={form.status} onChange={e => setF("status", e.target.value)} style={inputSt}>
                <option value="lead">見込み客</option>
                <option value="active">商談中</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>備考</label>
            <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); setForm(INITIAL_FORM); setError(""); }}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "登録中..." : "登録する"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="氏名・メール・電話で検索" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }} />
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全優先度</option>
            <option value="HIGH">🔴 高</option>
            <option value="NORMAL">🟡 普通</option>
            <option value="LOW">⚪ 低</option>
          </select>
          <select value={source} onChange={e => setSource(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全反響元</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!loading && <span style={{ fontSize: 12, color: "#706e68", marginLeft: "auto" }}>{total}件</span>}
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["優先度", "顧客名", "連絡先", "反響元", "問い合わせ物件", "AIスコア", "ステータス", "最終連絡", "操作"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid #e0deda" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>顧客データがありません</td></tr>
            ) : customers.map(c => {
              const latestInquiry = c.inquiries?.[0];
              const inqSource = latestInquiry?.source ?? c.source;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ ...(PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.NORMAL), padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {PRIORITY_LABELS[c.priority] ?? c.priority}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    {c.name_kana && <div style={{ fontSize: 11, color: "#706e68" }}>{c.name_kana}</div>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 12 }}>{c.email || "—"}</div>
                    <div style={{ fontSize: 11, color: "#706e68" }}>{c.phone || ""}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12 }}>
                    {inqSource ? (SOURCE_LABELS[inqSource] ?? inqSource) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#3a2a1a" }}>
                    {latestInquiry?.property_name ?? "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {(c.ai_score ?? latestInquiry?.ai_score) != null ? (
                      <span style={{ fontWeight: 700, fontSize: 14, color: (c.ai_score ?? latestInquiry?.ai_score ?? 0) >= 70 ? "#c62828" : "#3a2a1a" }}>
                        {c.ai_score ?? latestInquiry?.ai_score}
                      </span>
                    ) : <span style={{ color: "#aaa" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ ...(STATUS_BADGE[c.status] ?? {}), padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#706e68" }}>
                    {c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString("ja-JP") : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <a href={`/admin/customers/${c.id}`} style={{ fontSize: 12, color: "#234f35", textDecoration: "none", fontWeight: 500 }}>詳細</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
