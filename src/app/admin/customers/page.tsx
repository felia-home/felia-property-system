"use client";
import { useEffect, useState, useCallback } from "react";

const STATUS_LABELS: Record<string, string> = {
  NEW: "新規", CONTACTING: "連絡中", VISITING: "内見調整中",
  NEGOTIATING: "商談中", CONTRACT: "契約済", CLOSED: "成約",
  LOST: "失注", PENDING: "保留",
  // legacy
  lead: "見込み客", active: "商談中（旧）", contract: "契約済み（旧）", closed: "クローズ（旧）",
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  NEW:         { background: "#e3f2fd", color: "#1565c0" },
  CONTACTING:  { background: "#fff8e1", color: "#e65100" },
  VISITING:    { background: "#e8f5e9", color: "#2e7d32" },
  NEGOTIATING: { background: "#234f35", color: "#fff" },
  CONTRACT:    { background: "#1a237e", color: "#fff" },
  CLOSED:      { background: "#880e4f", color: "#fff" },
  LOST:        { background: "#fdeaea", color: "#8c1f1f" },
  PENDING:     { background: "#f3f2ef", color: "#706e68" },
};
const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOME'S", HP: "自社HP", TEL: "電話", WALK_IN: "来店",
  REFERRAL: "紹介", OTHER: "その他",
};
const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  HIGH:   { background: "#ffebee", color: "#c62828" },
  NORMAL: { background: "#fff8e1", color: "#e65100" },
  LOW:    { background: "#f5f5f5", color: "#616161" },
};
const PRIORITY_LABELS: Record<string, string> = { HIGH: "高", NORMAL: "普通", LOW: "低" };

interface FamilyMember { id: string; relation: string; name: string | null; age: number | null; }
interface InquiryItem { id: string; source: string; received_at: string; ai_score: number | null; property_name: string | null; }
interface StaffItem { id: string; name: string; }
interface Customer {
  id: string; name: string; name_kana: string | null;
  email: string | null; tel: string | null; tel_mobile: string | null;
  desired_budget_min: number | null; desired_budget_max: number | null;
  desired_areas: string[]; desired_property_type: string[];
  status: string; source: string | null; priority: string;
  ai_score: number | null;
  last_contact_at: string | null; next_contact_at: string | null;
  created_at: string;
  assigned_staff: StaffItem | null;
  family_members?: FamilyMember[];
  inquiries?: InquiryItem[];
}

const INITIAL_FORM = {
  name: "", name_kana: "", email: "", tel: "", tel_mobile: "",
  desired_budget_min: "", desired_budget_max: "", source: "",
  status: "NEW", priority: "NORMAL", internal_memo: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSource, setFilterSource] = useState("");
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
    if (filterStatus) params.set("status", filterStatus);
    if (filterPriority) params.set("priority", filterPriority);
    if (filterSource) params.set("source", filterSource);
    params.set("includeInquiries", "true");
    params.set("includeFamily", "true");
    fetch(`/api/customers?${params}`)
      .then(r => r.json())
      .then(d => { setCustomers(d.customers ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterStatus, filterPriority, filterSource]);

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
          desired_budget_min: form.desired_budget_min ? Number(form.desired_budget_min) : null,
          desired_budget_max: form.desired_budget_max ? Number(form.desired_budget_max) : null,
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
      const d = await res.json() as { imported?: number; error?: string };
      if (d.error) setSyncMsg(`❌ ${d.error}`);
      else { setSyncMsg(`✅ ${d.imported}件取込`); fetchCustomers(); }
    } catch { setSyncMsg("❌ 取込エラー"); }
    finally { setSyncing(false); }
  };

  const familyLabel = (members: FamilyMember[] = []) => {
    if (!members.length) return null;
    const spouse = members.find(m => m.relation === "配偶者");
    const children = members.filter(m => m.relation === "子供");
    const parts: string[] = [];
    if (spouse) parts.push("ご夫婦");
    if (children.length) parts.push(`お子様${children.length}名`);
    return parts.length ? parts.join("＋") : `${members.length}名`;
  };

  const inputSt: React.CSSProperties = {
    padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7,
    fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>顧客管理</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>反響・商談・追客を一元管理。AIスコア順に表示。</p>
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
              { label: "電話（自宅/固定）", k: "tel", ph: "03-0000-0000" },
              { label: "携帯電話", k: "tel_mobile", ph: "090-0000-0000" },
              { label: "予算下限（万円）", k: "desired_budget_min", ph: "5000" },
              { label: "予算上限（万円）", k: "desired_budget_max", ph: "8000" },
            ].map(({ label, k, ph }) => (
              <div key={k}>
                <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => setF(k, e.target.value)} placeholder={ph} style={inputSt} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>流入元</label>
              <select value={form.source} onChange={e => setF("source", e.target.value)} style={inputSt}>
                <option value="">選択</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>ステータス</label>
              <select value={form.status} onChange={e => setF("status", e.target.value)} style={inputSt}>
                <option value="NEW">新規</option>
                <option value="CONTACTING">連絡中</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>内部メモ</label>
            <textarea value={form.internal_memo} onChange={e => setF("internal_memo", e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" }} />
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

      {/* Filters + Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="氏名・メール・電話で検索" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全ステータス</option>
            {["NEW","CONTACTING","VISITING","NEGOTIATING","CONTRACT","CLOSED","LOST","PENDING"].map(k =>
              <option key={k} value={k}>{STATUS_LABELS[k]}</option>
            )}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全優先度</option>
            <option value="HIGH">高（HIGH）</option>
            <option value="NORMAL">普通</option>
            <option value="LOW">低</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全反響元</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!loading && <span style={{ fontSize: 12, color: "#706e68", marginLeft: "auto" }}>{total}件</span>}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["優先度/AI", "顧客・家族構成", "連絡先", "希望条件", "反響元", "担当者", "最終連絡/次回", "ステータス", "操作"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 12px", borderBottom: "1px solid #e0deda", whiteSpace: "nowrap" }}>{h}</th>
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
              const family = familyLabel(c.family_members);
              const budgetStr = [
                c.desired_budget_min ? `${c.desired_budget_min.toLocaleString()}万` : null,
                c.desired_budget_max ? `${c.desired_budget_max.toLocaleString()}万` : null,
              ].filter(Boolean).join("〜") || "—";
              const areaStr = c.desired_areas?.slice(0, 2).join("・") || "—";
              const typeStr = c.desired_property_type?.map(t =>
                t === "NEW_HOUSE" ? "新戸建" : t === "USED_HOUSE" ? "中古戸建" : t === "MANSION" ? "マンション" : t === "LAND" ? "土地" : t
              ).join("・") || "";
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ ...(PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.NORMAL), padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {PRIORITY_LABELS[c.priority] ?? c.priority}
                    </span>
                    {c.ai_score != null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.ai_score >= 70 ? "#c62828" : "#3a2a1a", marginTop: 2 }}>
                        {c.ai_score}点
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}様</div>
                    {c.name_kana && <div style={{ fontSize: 10, color: "#706e68" }}>{c.name_kana}</div>}
                    {family && <div style={{ fontSize: 11, color: "#3a6a8a", marginTop: 2 }}>{family}</div>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 11 }}>{c.email || "—"}</div>
                    <div style={{ fontSize: 11, color: "#706e68" }}>{c.tel_mobile || c.tel || ""}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{budgetStr}</div>
                    <div style={{ fontSize: 11, color: "#706e68" }}>{areaStr}</div>
                    {typeStr && <div style={{ fontSize: 10, color: "#706e68" }}>{typeStr}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {c.source ? (SOURCE_LABELS[c.source] ?? c.source) : latestInquiry?.source ? (SOURCE_LABELS[latestInquiry.source] ?? latestInquiry.source) : "—"}
                    {latestInquiry?.property_name && <div style={{ fontSize: 10, color: "#706e68" }}>{latestInquiry.property_name}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {c.assigned_staff?.name ?? <span style={{ color: "#aaa" }}>未設定</span>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "#706e68" }}>
                    <div>{c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString("ja-JP") : "—"}</div>
                    {c.next_contact_at && <div style={{ color: "#1565c0" }}>→ {new Date(c.next_contact_at).toLocaleDateString("ja-JP")}</div>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ ...(STATUS_BADGE[c.status] ?? { background: "#f3f2ef", color: "#706e68" }), padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
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
