"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  email: string;
  name: string;
  name_kana: string | null;
  phone: string | null;
  prefecture: string | null;
  city: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const displayed = showInactive
    ? members
    : members.filter((m) => m.is_active);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>👤 会員一覧</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 13 }}>
        HP登録会員の管理 — 全 {total} 名
      </p>

      {/* 検索・フィルタ */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center",
        marginBottom: 16, flexWrap: "wrap",
      }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="氏名・メール・電話番号で検索"
          style={{
            padding: "8px 12px", border: "1px solid #d1d5db",
            borderRadius: 7, fontSize: 13, width: 280,
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          退会・無効会員も表示
        </label>
        <button
          onClick={() => load()}
          style={{
            padding: "8px 16px", background: "#2563eb", color: "#fff",
            border: "none", borderRadius: 7, fontSize: 13, cursor: "pointer",
          }}
        >
          検索
        </button>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          表示: {displayed.length}名
        </span>
      </div>

      {/* テーブル */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            読み込み中...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            該当する会員はいません
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={th}>氏名</th>
                <th style={th}>メールアドレス</th>
                <th style={th}>電話番号</th>
                <th style={th}>居住地</th>
                <th style={th}>状態</th>
                <th style={th}>最終ログイン</th>
                <th style={th}>登録日</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: m.is_active ? "#fff" : "#fafafa",
                    opacity: m.is_active ? 1 : 0.65,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = m.is_active ? "#fff" : "#fafafa")}
                >
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    {m.name_kana && <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.name_kana}</div>}
                  </td>
                  <td style={{ ...td, color: "#2563eb" }}>{m.email}</td>
                  <td style={{ ...td, color: "#6b7280" }}>{m.phone ?? "—"}</td>
                  <td style={{ ...td, color: "#6b7280" }}>
                    {[m.prefecture, m.city].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: m.is_active ? "#dcfce7" : "#fee2e2",
                      color: m.is_active ? "#16a34a" : "#dc2626",
                    }}>
                      {m.is_active ? "有効" : "無効"}
                    </span>
                    {!m.email_verified && (
                      <span style={{
                        marginLeft: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10,
                        background: "#fef3c7", color: "#92400e",
                      }}>
                        未認証
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, color: "#6b7280", fontSize: 12 }}>
                    {m.last_login_at
                      ? new Date(m.last_login_at).toLocaleDateString("ja-JP")
                      : "未ログイン"}
                  </td>
                  <td style={{ ...td, color: "#6b7280", fontSize: 12 }}>
                    {new Date(m.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={pageBtnStyle(page <= 1)}
          >
            ← 前へ
          </button>
          <span style={{ fontSize: 13, color: "#374151", padding: "6px 12px" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={pageBtnStyle(page >= totalPages)}
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left",
  fontSize: 12, fontWeight: 600, color: "#6b7280",
};
const td: React.CSSProperties = {
  padding: "10px 14px", verticalAlign: "middle",
};

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 16px", borderRadius: 6, fontSize: 13,
    border: "1px solid #d1d5db",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#9ca3af" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
