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
  last_contacted_at: string | null;
  next_action_date: string | null;
  created_at: string;
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((d) => { setCustomers(d.customers ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name) { setError("氏名は必須です"); return; }
    setSaving(true);
    setError("");
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
      setShowForm(false);
      setForm(INITIAL_FORM);
      fetchCustomers();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = { padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>顧客管理</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>問い合わせ・商談中の顧客を管理</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          + 新規登録
        </button>
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
                <input value={(form as Record<string, string>)[k]} onChange={(e) => setF(k, e.target.value)} placeholder={ph} style={inputSt} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>希望物件種別</label>
              <select value={form.property_type_pref} onChange={(e) => setF("property_type_pref", e.target.value)} style={inputSt}>
                <option value="">指定なし</option>
                <option value="USED_HOUSE">中古戸建</option>
                <option value="NEW_HOUSE">新築戸建</option>
                <option value="MANSION">マンション</option>
                <option value="LAND">土地</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>ステータス</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)} style={inputSt}>
                <option value="lead">見込み客</option>
                <option value="active">商談中</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>備考</label>
            <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2}
              style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); setForm(INITIAL_FORM); setError(""); }} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "登録中..." : "登録する"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="氏名・メール・電話で検索" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!loading && <span style={{ fontSize: 12, color: "#706e68", marginLeft: "auto" }}>{total}件</span>}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["顧客名", "連絡先", "予算", "希望物件", "ステータス", "最終連絡", "操作"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>顧客データがありません</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  {c.name_kana && <div style={{ fontSize: 11, color: "#706e68" }}>{c.name_kana}</div>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 12 }}>{c.email || "—"}</div>
                  <div style={{ fontSize: 11, color: "#706e68" }}>{c.phone || ""}</div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12 }}>
                  {c.budget_min || c.budget_max
                    ? `${c.budget_min?.toLocaleString() ?? "?"}〜${c.budget_max?.toLocaleString() ?? "?"}万円`
                    : "—"}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12 }}>
                  {c.property_type_pref ? { USED_HOUSE: "中古戸建", NEW_HOUSE: "新築戸建", MANSION: "マンション", LAND: "土地" }[c.property_type_pref] ?? c.property_type_pref : "指定なし"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ ...(STATUS_BADGE[c.status] ?? {}), padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#706e68" }}>
                  {c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString("ja-JP") : "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <a href={`/admin/customers/${c.id}`} style={{ fontSize: 12, color: "#234f35", textDecoration: "none", fontWeight: 500 }}>詳細</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
