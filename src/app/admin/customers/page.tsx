"use client";
import { useEffect, useState, useCallback, useRef } from "react";

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
  HOMES: "HOME'S", HP: "自社HP", HP_MEMBER: "HP会員登録", TEL: "電話", WALK_IN: "来店",
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

  // PDF modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF -> Customer matching
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    property_info: {
      price_man?:    number;
      areas?:        string[];
      property_type?: string;
      rooms?:        string;
      station_name?: string;
      walk_min?:     number;
    };
    customers: Array<{
      id: string;
      name: string;
      score: number;
      desired_budget_max: number | null;
      desired_areas: string[];
      assigned: { id: string; name: string } | null;
    }>;
    total: number;
  } | null>(null);

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

  // ── PDF parse handlers ──
  const handlePdfFileSelect = async (file?: File) => {
    if (!file) return;
    setParsing(true);
    setPdfError("");
    setParsedData(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/customers/parse-pdf", { method: "POST", body: fd });
      const data = await res.json() as { success?: boolean; data?: Record<string, unknown>; error?: string };
      if (data.success && data.data) {
        setParsedData(data.data);
      } else {
        setPdfError(data.error ?? "解析に失敗しました");
      }
    } catch {
      setPdfError("通信エラーが発生しました");
    } finally {
      setParsing(false);
    }
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handlePdfFileSelect(file);
  };

  const handlePdfRegister = async () => {
    if (!parsedData) return;
    setPdfSaving(true);
    setPdfError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsedData.name,
          name_kana: parsedData.name_kana,
          email: parsedData.email,
          tel: parsedData.tel,
          tel_mobile: parsedData.tel_mobile,
          postal_code: parsedData.postal_code,
          prefecture: parsedData.prefecture,
          city: parsedData.city,
          address: parsedData.address,
          current_housing_type: parsedData.current_housing_type,
          current_rent: parsedData.current_rent,
          occupation: parsedData.occupation,
          annual_income: parsedData.annual_income,
          source: parsedData.source ?? "OTHER",
          desired_property_type: parsedData.desired_property_type ?? [],
          desired_areas: parsedData.desired_areas ?? [],
          desired_budget_max: parsedData.desired_budget_max,
          desired_move_timing: parsedData.desired_move_timing,
          finance_type: parsedData.finance_type,
          down_payment: parsedData.down_payment,
          has_property_to_sell: parsedData.has_property_to_sell ?? false,
          internal_memo: [parsedData.inquiry_note, parsedData.internal_memo].filter(Boolean).join("\n") || null,
          status: "NEW",
        }),
      });
      const result = await res.json() as { customer?: { id: string }; error?: string };
      if (!res.ok || !result.customer) {
        setPdfError(result.error ?? "登録に失敗しました");
        return;
      }
      // 家族構成を登録
      const members = (parsedData.family_members as Record<string, unknown>[] | undefined) ?? [];
      for (const m of members) {
        await fetch(`/api/customers/${result.customer.id}/family`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(m),
        });
      }
      setShowPdfModal(false);
      setParsedData(null);
      fetchCustomers();
    } catch {
      setPdfError("通信エラーが発生しました");
    } finally {
      setPdfSaving(false);
    }
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
          <button onClick={() => { setShowPdfModal(true); setParsedData(null); setPdfError(""); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#6a1b9a", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            📄 顧客簿から登録
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + 新規登録
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* PDFマッチング検索 */}
      <div style={{ marginBottom: 16, padding: 16, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#166534", marginBottom: 8 }}>
          🏠 物件PDFで顧客マッチング
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 6,
            cursor: matchLoading ? "wait" : "pointer",
            border: "1px solid #86efac", background: "#fff",
            fontSize: 13, color: "#166534",
            opacity: matchLoading ? 0.6 : 1,
          }}>
            📄 PDFを選択（複数可）
            <input
              type="file"
              accept=".pdf"
              multiple
              disabled={matchLoading}
              style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                setMatchLoading(true);
                setMatchResult(null);
                try {
                  const fd = new FormData();
                  files.forEach(f => fd.append("files", f));
                  const res = await fetch("/api/properties/match-customers", {
                    method: "POST", body: fd,
                  });
                  const data = await res.json();
                  setMatchResult(data);
                } finally {
                  setMatchLoading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          {matchLoading && <span style={{ fontSize: 12, color: "#6b7280" }}>⏳ AI解析中...</span>}
          {matchResult && (
            <span style={{ fontSize: 12, color: "#166534" }}>
              ✅ {matchResult.total}件がマッチしました
            </span>
          )}
          {matchResult && (
            <button
              type="button"
              onClick={() => setMatchResult(null)}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                background: "#fff", color: "#6b7280", fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              クリア
            </button>
          )}
        </div>

        {matchResult && matchResult.customers.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 8 }}>
              解析結果: {matchResult.property_info.areas?.join("・") ?? ""} /
              {matchResult.property_info.price_man ? ` ${matchResult.property_info.price_man.toLocaleString()}万円` : ""} /
              {matchResult.property_info.rooms ? ` ${matchResult.property_info.rooms}` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {matchResult.customers.slice(0, 10).map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "8px 12px", background: "#fff",
                  border: "1px solid #d1fae5", borderRadius: 6,
                }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 8, fontSize: 11,
                    background: "#f0fdf4", color: "#166534", fontWeight: "bold",
                  }}>
                    {c.score}点
                  </span>
                  <span style={{ fontWeight: "bold", fontSize: 13, flex: 1, minWidth: 100 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>
                    {c.desired_budget_max ? `〜${c.desired_budget_max.toLocaleString()}万` : "予算未設定"}
                    {c.desired_areas.length > 0 ? ` / ${c.desired_areas.slice(0, 2).join("・")}` : ""}
                  </span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    {c.assigned?.name ?? "未割当"}
                  </span>
                  <a href={`/admin/customers/${c.id}`}
                    style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>
                    詳細→
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        {matchResult && matchResult.total === 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            希望条件にマッチする顧客は見つかりませんでした
          </div>
        )}
      </div>

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

      {/* HP会員タブ */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
        {([
          { key: "",          label: "全顧客" },
          { key: "HP_MEMBER", label: "👤 HP会員" },
        ] as { key: string; label: string }[]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterSource(tab.key)}
            style={{
              padding: "8px 20px", border: "none", background: "none",
              fontSize: 13, fontWeight: filterSource === tab.key ? "bold" : "normal",
              color: filterSource === tab.key ? "#5BAD52" : "#6b7280",
              borderBottom: filterSource === tab.key ? "2px solid #5BAD52" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {c.name} 様
                      {c.source === "HP_MEMBER" && (
                        <span style={{ fontSize: 10, background: "#e3f2fd", color: "#1565c0", padding: "1px 7px", borderRadius: 99, fontWeight: 700, marginLeft: 6 }}>
                          HP会員
                        </span>
                      )}
                    </div>
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

      {/* PDF upload modal */}
      {showPdfModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button
              onClick={() => { setShowPdfModal(false); setParsedData(null); setPdfError(""); }}
              style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#706e68", lineHeight: 1 }}
            >×</button>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>📄 顧客簿PDFから登録</h2>
            <p style={{ fontSize: 12, color: "#706e68", marginBottom: 20 }}>
              フェリアホームの顧客簿PDFをアップロードするとAIが自動で顧客情報を読み取ります
            </p>

            {pdfError && (
              <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{pdfError}</div>
            )}

            {/* Step 1: ファイル選択 */}
            {!parsedData && !parsing && (
              <div>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handlePdfDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #c8c6c0", borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "#fafaf8" }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 14, color: "#706e68" }}>PDFをドラッグ＆ドロップ<br />またはクリックしてファイルを選択</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handlePdfFileSelect(e.target.files?.[0])} />
              </div>
            )}

            {parsing && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#706e68" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 14 }}>AIが顧客情報を解析中...</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>しばらくお待ちください（10〜20秒）</div>
              </div>
            )}

            {/* Step 2: 解析結果確認 */}
            {parsedData && !pdfSaving && (
              <div>
                <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20, color: "#2e7d32" }}>
                  ✅ AI解析完了。内容を確認して登録してください。
                </div>

                {/* 基本情報 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#706e68", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>基本情報</div>
                  {[
                    { label: "氏名", value: parsedData.name as string },
                    { label: "フリガナ", value: parsedData.name_kana as string },
                    { label: "メール①", value: parsedData.email as string },
                    { label: "メール②", value: parsedData.email2 as string },
                    { label: "携帯", value: parsedData.tel_mobile as string },
                    { label: "TEL", value: parsedData.tel as string },
                    { label: "住所", value: [parsedData.prefecture, parsedData.city, parsedData.address].filter(Boolean).join("") as string },
                    { label: "現在のお住まい", value: parsedData.current_housing_type as string },
                    { label: "職業", value: parsedData.occupation as string },
                    { label: "年収", value: parsedData.annual_income ? `${parsedData.annual_income}万円` : null },
                  ].filter(row => row.value).map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f3f2ef", fontSize: 13 }}>
                      <span style={{ color: "#706e68", minWidth: 100, fontSize: 12 }}>{label}</span>
                      <span style={{ flex: 1 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* 希望条件 */}
                {(parsedData.desired_budget_max || (parsedData.desired_areas as string[] | undefined)?.length || (parsedData.desired_property_type as string[] | undefined)?.length) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#706e68", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>希望条件</div>
                    {[
                      { label: "予算上限", value: parsedData.desired_budget_max ? `${parsedData.desired_budget_max}万円` : null },
                      { label: "希望地域", value: (parsedData.desired_areas as string[] | undefined)?.join("・") },
                      { label: "物件種別", value: (parsedData.desired_property_type as string[] | undefined)?.join("・") },
                      { label: "購入時期", value: parsedData.desired_move_timing as string },
                    ].filter(row => row.value).map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f3f2ef", fontSize: 13 }}>
                        <span style={{ color: "#706e68", minWidth: 100, fontSize: 12 }}>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 家族構成 */}
                {(parsedData.family_members as Record<string, unknown>[] | undefined)?.length ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#706e68", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>家族構成</div>
                    {(parsedData.family_members as Record<string, unknown>[]).map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f3f2ef", fontSize: 13 }}>
                        <span style={{ color: "#706e68", minWidth: 60, fontSize: 12 }}>{m.relation as string}</span>
                        <span>{m.name as string}{m.age ? ` / ${m.age}歳` : ""}{m.occupation ? ` / ${m.occupation}` : ""}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* 備考 */}
                {(parsedData.inquiry_note || parsedData.internal_memo) && (
                  <div style={{ background: "#f8f6f3", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#5a4a3a", marginBottom: 16 }}>
                    {[parsedData.inquiry_note, parsedData.internal_memo].filter(Boolean).join("\n")}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setParsedData(null); setPdfError(""); }}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    やり直す
                  </button>
                  <button onClick={handlePdfRegister}
                    style={{ flex: 2, padding: "10px", borderRadius: 8, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                    この内容で顧客登録する
                  </button>
                </div>
              </div>
            )}

            {pdfSaving && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#706e68", fontSize: 14 }}>登録中...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
