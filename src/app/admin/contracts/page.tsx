"use client";
import { useEffect, useState, useCallback } from "react";
import { calcCommission } from "@/lib/commission";

const STATUS_LABELS: Record<string, string> = {
  draft: "作成中", signed: "署名済み", completed: "完了", cancelled: "キャンセル",
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  draft:     { background: "#f3f2ef", color: "#706e68" },
  signed:    { background: "#e3f0ff", color: "#1a56a0" },
  completed: { background: "#234f35", color: "#fff" },
  cancelled: { background: "#fdeaea", color: "#8c1f1f" },
};

interface ContractItem {
  id: string; status: string;
  contract_price: number; commission_type: string; commission_amount: number | null;
  agent_id: string | null; contract_date: string | null;
  customer: { id: string; name: string } | null;
  property_address: string | null;
}

interface CustomerOption {
  id: string; name: string;
}

const INITIAL_FORM = {
  customer_id: "", agent_id: "",
  status: "draft", contract_price: "", commission_type: "both",
  contract_date: "", settlement_date: "", notes: "",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    fetch(`/api/contracts?${params}`)
      .then((r) => r.json())
      .then((d) => { setContracts(d.contracts ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const fetchOptions = () => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  };

  const handleOpenForm = () => { fetchOptions(); setShowForm(true); };

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const previewCommission = form.contract_price
    ? calcCommission(Number(form.contract_price), form.commission_type as "buyer" | "seller" | "both")
    : 0;

  const handleCreate = async () => {
    if (!form.contract_price) {
      setError("契約価格は必須です");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          property_id: null,
          contract_price: Number(form.contract_price),
          customer_id: form.customer_id || null,
          agent_id: form.agent_id || null,
          contract_date: form.contract_date || null,
          settlement_date: form.settlement_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました"); return; }
      setShowForm(false);
      setForm(INITIAL_FORM);
      fetchContracts();
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
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>契約管理</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>売買契約・仲介手数料の管理</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/contracts/new" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#c9a96e", color: "#fff", border: "none", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            📄 契約書を作成
          </a>
          <button onClick={handleOpenForm} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + 簡易登録
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Quick registration form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>簡易契約登録</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>顧客</label>
              <select value={form.customer_id} onChange={(e) => setF("customer_id", e.target.value)} style={inputSt}>
                <option value="">選択してください</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>担当者ID</label>
              <input value={form.agent_id} onChange={(e) => setF("agent_id", e.target.value)} placeholder="agent_001" style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>契約価格（万円） *</label>
              <input type="number" value={form.contract_price} onChange={(e) => setF("contract_price", e.target.value)} placeholder="8000" style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>仲介形態</label>
              <select value={form.commission_type} onChange={(e) => setF("commission_type", e.target.value)} style={inputSt}>
                <option value="both">両手仲介</option>
                <option value="buyer">片手（買主側）</option>
                <option value="seller">片手（売主側）</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>仲介手数料（自動計算）</label>
              <div style={{ padding: "7px 10px", background: "#f7f6f2", borderRadius: 7, fontSize: 13, fontWeight: 500, color: previewCommission > 0 ? "#234f35" : "#706e68" }}>
                {previewCommission > 0 ? `${previewCommission.toLocaleString()}万円（税込）` : "価格入力で自動計算"}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>ステータス</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)} style={inputSt}>
                <option value="draft">作成中</option>
                <option value="signed">署名済み</option>
                <option value="completed">完了</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>契約日</label>
              <input type="date" value={form.contract_date} onChange={(e) => setF("contract_date", e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>決済日</label>
              <input type="date" value={form.settlement_date} onChange={(e) => setF("settlement_date", e.target.value)} style={inputSt} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>備考</label>
            <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" }} />
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
              {["顧客", "契約価格", "仲介手数料", "ステータス", "契約日"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>契約データがありません</td></tr>
            ) : contracts.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{c.customer?.name ?? "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{c.contract_price.toLocaleString()}万円</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#234f35", fontWeight: 500 }}>
                  {c.commission_amount ? `${c.commission_amount.toLocaleString()}万円` : "—"}
                  <div style={{ fontSize: 10, color: "#706e68", fontWeight: 400 }}>
                    {c.commission_type === "both" ? "両手" : "片手"}
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ ...(STATUS_BADGE[c.status] ?? {}), padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#706e68" }}>
                  {c.contract_date ? new Date(c.contract_date).toLocaleDateString("ja-JP") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
