"use client";
import { useState, useCallback } from "react";

type MatchedMember = {
  member: { id: string; name: string; email: string };
  matched_count: number;
  property_ids: string[];
};

type SendResult = {
  member_id: string;
  ok: boolean;
  error?: string;
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<MatchedMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [subject, setSubject] = useState("【フェリアホーム】新着物件のお知らせ");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState("");

  const runMatch = useCallback(async () => {
    setLoading(true);
    setError("");
    setSendResults([]);
    try {
      const res = await fetch("/api/admin/notifications/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberId ? { member_id: memberId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "マッチング失敗");
      setResults(data.results);
      // デフォルト全選択
      setSelected(new Set(data.results.map((r: MatchedMember) => r.member.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(results.map((r) => r.member.id)));
  const deselectAll = () => setSelected(new Set());

  const sendNotifications = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}名に通知メールを送信します。よろしいですか？`)) return;

    setSending(true);
    setSendResults([]);
    setError("");

    const targets = results.filter((r) => selected.has(r.member.id));
    const outcomes: SendResult[] = [];

    for (const target of targets) {
      try {
        const res = await fetch("/api/admin/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: target.member.id,
            property_ids: target.property_ids,
            subject,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          outcomes.push({ member_id: target.member.id, ok: true });
        } else {
          outcomes.push({ member_id: target.member.id, ok: false, error: data.error });
        }
      } catch {
        outcomes.push({ member_id: target.member.id, ok: false, error: "通信エラー" });
      }
    }

    setSendResults(outcomes);
    setSending(false);
  };

  const successCount = sendResults.filter((r) => r.ok).length;
  const failCount = sendResults.filter((r) => !r.ok).length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📧 通知管理</h1>
      <p style={{ color: "#6b7280", marginBottom: 28, fontSize: 13 }}>
        会員の検索条件にマッチした物件を一括通知します
      </p>

      {/* 設定エリア */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 10, padding: 24, marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>送信設定</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              会員ID（省略で全会員）
            </label>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="特定会員のみ対象にする場合に入力"
              style={{
                width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
                borderRadius: 6, fontSize: 13, boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              メール件名
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
                borderRadius: 6, fontSize: 13, boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <button
          onClick={runMatch}
          disabled={loading}
          style={{
            background: "#2563eb", color: "#fff", border: "none",
            borderRadius: 7, padding: "10px 24px", fontSize: 14,
            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "マッチング中..." : "🔍 マッチング実行"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
          color: "#991b1b", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* 結果 */}
      {results.length > 0 && (
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 10, padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              マッチング結果 — {results.length}名
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={smallBtnStyle("#f3f4f6", "#374151")}>全選択</button>
              <button onClick={deselectAll} style={smallBtnStyle("#f3f4f6", "#374151")}>全解除</button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={thStyle}>選択</th>
                <th style={thStyle}>氏名</th>
                <th style={thStyle}>メールアドレス</th>
                <th style={thStyle}>マッチ数</th>
                <th style={thStyle}>送信結果</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const result = sendResults.find((s) => s.member_id === r.member.id);
                return (
                  <tr key={r.member.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.member.id)}
                        onChange={() => toggleSelect(r.member.id)}
                      />
                    </td>
                    <td style={tdStyle}>{r.member.name}</td>
                    <td style={{ ...tdStyle, color: "#6b7280" }}>{r.member.email}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                      {r.matched_count}件
                    </td>
                    <td style={tdStyle}>
                      {result ? (
                        result.ok ? (
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ 送信済み</span>
                        ) : (
                          <span style={{ color: "#dc2626" }}>✕ {result.error}</span>
                        )
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 送信ボタン */}
          {sendResults.length === 0 && (
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={sendNotifications}
                disabled={sending || selected.size === 0}
                style={{
                  background: "#16a34a", color: "#fff", border: "none",
                  borderRadius: 7, padding: "10px 28px", fontSize: 14,
                  fontWeight: 600, cursor: sending || selected.size === 0 ? "not-allowed" : "pointer",
                  opacity: sending || selected.size === 0 ? 0.6 : 1,
                }}
              >
                {sending ? "送信中..." : `📩 選択した${selected.size}名に送信`}
              </button>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                ※ 送信前に必ず件名・対象を確認してください
              </span>
            </div>
          )}
        </div>
      )}

      {/* 送信完了サマリー */}
      {sendResults.length > 0 && (
        <div style={{
          background: successCount > 0 ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${successCount > 0 ? "#86efac" : "#fca5a5"}`,
          borderRadius: 10, padding: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            送信完了
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            ✓ 成功: <strong>{successCount}名</strong>
            {failCount > 0 && (
              <span style={{ marginLeft: 16, color: "#dc2626" }}>
                ✕ 失敗: <strong>{failCount}名</strong>
              </span>
            )}
          </div>
          <button
            onClick={() => { setSendResults([]); setResults([]); setSelected(new Set()); }}
            style={{ marginTop: 12, ...smallBtnStyle("#fff", "#374151") }}
          >
            リセット
          </button>
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "#9ca3af", fontSize: 13,
        }}>
          マッチング実行ボタンを押すと、通知対象の会員が一覧表示されます
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", fontSize: 12,
  fontWeight: 600, color: "#6b7280",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px", verticalAlign: "middle",
};

function smallBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, color, border: "1px solid #e5e7eb",
    borderRadius: 6, padding: "6px 14px", fontSize: 12,
    cursor: "pointer", fontFamily: "inherit",
  };
}
