"use client";
import { useEffect, useState } from "react";

interface FollowUpCustomer {
  id: string;
  name: string;
  desired_areas: string[];
  desired_budget_max: number | null;
  last_contact_at: string | null;
  status: string;
  ai_score: number | null;
  assigned_to: string | null;
  assigned_staff: { name: string } | null;
}

interface FollowUpResult {
  customer_id: string;
  customer_name: string;
  action: "EMAIL" | "SKIP";
  subject?: string;
  body?: string;
  reason: string;
  suggested_properties?: string[];
}

interface ResultState {
  result: FollowUpResult;
  expanded: boolean;
  editing: boolean;
  editSubject: string;
  editBody: string;
  executed: boolean;
  executing: boolean;
}

function daysSince(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 12,
};

export default function FollowUpPage() {
  const [customers, setCustomers] = useState<FollowUpCustomer[]>([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [results, setResults] = useState<ResultState[]>([]);
  const [executingAll, setExecutingAll] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/customers/follow-up")
      .then(r => r.json())
      .then(d => {
        setCustomers(d.customers ?? []);
        setCount(d.count ?? 0);
      })
      .catch(() => setError("一覧の取得に失敗しました"))
      .finally(() => setLoadingList(false));
  }, []);

  const handlePreview = async () => {
    setPreviewing(true); setError(""); setResults([]);
    try {
      const res = await fetch("/api/customers/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview" }),
      });
      const d = await res.json() as { results?: FollowUpResult[]; error?: string };
      if (d.error) { setError(d.error); return; }
      setResults((d.results ?? []).map(r => ({
        result: r,
        expanded: false,
        editing: false,
        editSubject: r.subject ?? "",
        editBody: r.body ?? "",
        executed: false,
        executing: false,
      })));
    } catch { setError("プレビュー生成に失敗しました"); }
    finally { setPreviewing(false); }
  };

  const handleExecuteOne = async (idx: number) => {
    const state = results[idx];
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, executing: true } : r));
    try {
      const res = await fetch(`/api/customers/${state.result.customer_id}/follow-up-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: state.editSubject || state.result.subject,
          body: state.editBody || state.result.body,
          reason: state.result.reason,
        }),
      });
      if (!res.ok) throw new Error("実行エラー");
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, executed: true, executing: false, editing: false } : r));
      // Refresh list count
      setCount(prev => Math.max(0, prev - 1));
    } catch {
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, executing: false } : r));
      setError(`${state.result.customer_name} 様の送信に失敗しました`);
    }
  };

  const handleExecuteAll = async () => {
    const emailResults = results.filter(r => r.result.action === "EMAIL" && !r.executed);
    if (emailResults.length === 0) return;
    if (!confirm(`${emailResults.length}名に一括実行します。よろしいですか？`)) return;
    setExecutingAll(true); setError("");
    try {
      // Build overrides from edited content
      const overrides: Record<string, { subject: string; body: string }> = {};
      emailResults.forEach(r => {
        overrides[r.result.customer_id] = {
          subject: r.editSubject || r.result.subject || "",
          body: r.editBody || r.result.body || "",
        };
      });
      const res = await fetch("/api/customers/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execute",
          customer_ids: emailResults.map(r => r.result.customer_id),
          overrides,
        }),
      });
      const d = await res.json() as { count?: number; error?: string };
      if (d.error) { setError(d.error); return; }
      // Mark all as executed
      setResults(prev => prev.map(r =>
        r.result.action === "EMAIL" && !r.executed ? { ...r, executed: true } : r
      ));
      setMsg(`✅ ${d.count ?? emailResults.length}名への追客メールを実行しました`);
      setTimeout(() => setMsg(""), 5000);
    } catch { setError("一括実行に失敗しました"); }
    finally { setExecutingAll(false); }
  };

  const toggleExpand = (idx: number) =>
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));
  const toggleEdit = (idx: number) =>
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, editing: !r.editing } : r));

  const emailCount = results.filter(r => r.result.action === "EMAIL" && !r.executed).length;
  const executedCount = results.filter(r => r.executed).length;

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>🤖 AI自動追客</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          担当者が追っていない顧客にAIがアポイントメールを生成します。送信前に必ず内容を確認してください。
        </p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* Summary card */}
      <div style={{ ...card, borderLeft: "3px solid #1565c0", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            {loadingList ? (
              <span style={{ fontSize: 14, color: "#706e68" }}>読み込み中...</span>
            ) : (
              <>
                <span style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? "#c62828" : "#234f35" }}>{count}</span>
                <span style={{ fontSize: 14, color: "#706e68", marginLeft: 4 }}>名が7日以上未連絡</span>
              </>
            )}
          </div>
          <button
            onClick={handlePreview}
            disabled={previewing || count === 0}
            style={{
              padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: previewing || count === 0 ? "#888" : "#1565c0",
              color: "#fff", border: "none",
              cursor: previewing || count === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>
            {previewing ? "AIが生成中..." : "🤖 AIでメッセージを一括プレビュー"}
          </button>
        </div>

        {/* Target customer list */}
        {!loadingList && customers.length > 0 && results.length === 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #f0ede8", paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: "#706e68", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".07em" }}>追客対象顧客</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {customers.map(c => {
                const days = daysSince(c.last_contact_at);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
                    <a href={`/admin/customers/${c.id}`} style={{ color: "#234f35", fontWeight: 500, textDecoration: "none", minWidth: 100 }}>
                      {c.name} 様
                    </a>
                    <span style={{ color: "#706e68" }}>{c.desired_areas?.join("・") || "エリア未設定"}</span>
                    {c.desired_budget_max && <span style={{ color: "#706e68" }}>{c.desired_budget_max.toLocaleString()}万円以内</span>}
                    <span style={{
                      background: days === null || days >= 30 ? "#fdeaea" : "#fff8e1",
                      color: days === null || days >= 30 ? "#8c1f1f" : "#8a5200",
                      padding: "1px 8px", borderRadius: 10, fontSize: 11,
                    }}>
                      {days === null ? "未連絡" : `${days}日未連絡`}
                    </span>
                    {c.assigned_staff && <span style={{ color: "#888" }}>担当: {c.assigned_staff.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preview results */}
      {results.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#706e68" }}>
              {results.length}名を分析 — EMAIL: {results.filter(r => r.result.action === "EMAIL").length}件 / スキップ: {results.filter(r => r.result.action === "SKIP").length}件
              {executedCount > 0 && <span style={{ color: "#2e7d32", marginLeft: 10 }}>✅ 実行済み: {executedCount}件</span>}
            </div>
            {emailCount > 0 && (
              <button
                onClick={handleExecuteAll}
                disabled={executingAll}
                style={{
                  padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: executingAll ? "#888" : "#234f35",
                  color: "#fff", border: "none",
                  cursor: executingAll ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}>
                {executingAll ? "実行中..." : `✅ EMAIL ${emailCount}件を一括実行`}
              </button>
            )}
          </div>

          {results.map((state, idx) => {
            const { result, expanded, editing, editSubject, editBody, executed, executing } = state;
            const days = customers.find(c => c.id === result.customer_id);
            const dayCount = daysSince(days?.last_contact_at ?? null);

            return (
              <div key={result.customer_id} style={{
                ...card,
                borderLeft: executed ? "3px solid #4caf50" : result.action === "SKIP" ? "3px solid #ccc" : "3px solid #1565c0",
                opacity: result.action === "SKIP" ? 0.7 : 1,
              }}>
                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>
                        {result.action === "EMAIL" ? "✅" : "⏭"} {result.customer_name} 様
                      </span>
                      {dayCount != null && (
                        <span style={{ fontSize: 11, background: "#fff8e1", color: "#8a5200", padding: "2px 8px", borderRadius: 10 }}>
                          {dayCount}日未連絡
                        </span>
                      )}
                      {executed && (
                        <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: 10 }}>
                          追客済み
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
                      {result.action === "SKIP"
                        ? `スキップ: ${result.reason}`
                        : `理由: ${result.reason}`}
                    </div>
                    {result.action === "EMAIL" && !expanded && result.subject && (
                      <div style={{ fontSize: 12, color: "#3a2a1a", marginTop: 4 }}>
                        件名: <strong>{result.subject}</strong>
                      </div>
                    )}
                  </div>
                  {result.action === "EMAIL" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!executed && (
                        <>
                          <button onClick={() => toggleExpand(idx)}
                            style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                            {expanded ? "折りたたむ▲" : "全文を見る▼"}
                          </button>
                          <button onClick={() => toggleEdit(idx)}
                            style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                            ✏️ 編集
                          </button>
                          <button onClick={() => handleExecuteOne(idx)} disabled={executing}
                            style={{ padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", background: executing ? "#888" : "#234f35", color: "#fff", cursor: executing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                            {executing ? "送信中..." : "✅ 送信"}
                          </button>
                        </>
                      )}
                      {executed && (
                        <a href={`/admin/customers/${result.customer_id}`}
                          style={{ fontSize: 11, color: "#234f35", textDecoration: "none", padding: "5px 12px", border: "1px solid #234f35", borderRadius: 6 }}>
                          詳細を見る
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded / Edit view */}
                {result.action === "EMAIL" && (expanded || editing) && !executed && (
                  <div style={{ marginTop: 14, borderTop: "1px solid #f0ede8", paddingTop: 14 }}>
                    {editing ? (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>件名</label>
                          <input
                            value={editSubject}
                            onChange={e => setResults(prev => prev.map((r, i) => i === idx ? { ...r, editSubject: e.target.value } : r))}
                            style={{ padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>本文</label>
                          <textarea
                            value={editBody}
                            rows={10}
                            onChange={e => setResults(prev => prev.map((r, i) => i === idx ? { ...r, editBody: e.target.value } : r))}
                            style={{ padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", resize: "vertical" }} />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                          <button onClick={() => toggleEdit(idx)}
                            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>完了</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                          件名: {editSubject || result.subject}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#3a2a1a", background: "#fafaf8", padding: "12px 14px", borderRadius: 8 }}>
                          {editBody || result.body}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
