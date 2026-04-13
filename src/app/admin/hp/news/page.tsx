"use client";
import { useState, useEffect } from "react";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  published_at: string | null;
};

const CATEGORIES = [
  { value: "NEWS", label: "お知らせ", bg: "#e6f1fb", color: "#185fa5" },
  { value: "PROPERTY", label: "物件情報", bg: "#eaf3de", color: "#3b6d11" },
  { value: "EVENT", label: "イベント", bg: "#faeeda", color: "#854f0b" },
];

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{ width: "44px", height: "24px", borderRadius: "100px", cursor: "pointer", background: on ? "#1a3a2a" : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", left: on ? "23px" : "3px" }} />
  </div>
);

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "NEWS", is_published: false });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const load = () => fetch("/api/news").then(r => r.json()).then((d: { news?: NewsItem[] }) => setNewsList(d.news ?? []));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setEditing(null); setForm({ title: "", content: "", category: "NEWS", is_published: false }); setShowForm(true); };
  const openEdit = (n: NewsItem) => { setEditing(n); setForm({ title: n.title, content: n.content, category: n.category, is_published: n.is_published }); setShowForm(true); };
  const handleSave = async () => {
    setSaving(true);
    await fetch(editing ? `/api/news/${editing.id}` : "/api/news", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setShowForm(false); setEditing(null); load();
  };
  const togglePublish = async (n: NewsItem) => {
    await fetch(`/api/news/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...n, is_published: !n.is_published }) });
    load();
  };
  const handleDelete = async (id: string) => { if (!confirm("削除しますか？")) return; await fetch(`/api/news/${id}`, { method: "DELETE" }); load(); };

  const filtered = newsList.filter(n => filter === "all" ? true : filter === "published" ? n.is_published : !n.is_published);
  const published = newsList.filter(n => n.is_published).length;
  const draft = newsList.filter(n => !n.is_published).length;

  return (
    <div style={{ padding: "32px", maxWidth: "860px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1a1a1a" }}>お知らせ管理</h1>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>HPのNewsセクションに表示されます</p>
        </div>
        <button onClick={openNew} style={{ background: "#1a3a2a", color: "white", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          ＋ 新しいお知らせ
        </button>
      </div>

      {/* フィルタータブ */}
      <div style={{ display: "flex", gap: "4px", background: "#f5f5f5", borderRadius: "12px", padding: "4px", width: "fit-content", marginBottom: "20px" }}>
        {[
          { key: "all", label: `すべて (${newsList.length})` },
          { key: "published", label: `公開中 (${published})` },
          { key: "draft", label: `下書き (${draft})` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as "all" | "published" | "draft")} style={{
            padding: "7px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit",
            background: filter === t.key ? "white" : "transparent",
            color: filter === t.key ? "#1a1a1a" : "#888",
            boxShadow: filter === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* フォーム */}
      {showForm && (
        <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{editing ? "お知らせを編集" : "新しいお知らせ"}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>タイトル <span style={{ color: "#e44" }}>*</span></label>
                <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>カテゴリ</label>
                <select value={form.category} onChange={e => f("category", e.target.value)}
                  style={{ padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", background: "white", fontFamily: "inherit" }}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>本文</label>
              <textarea value={form.content} onChange={e => f("content", e.target.value)} rows={6}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Toggle on={form.is_published} onClick={() => f("is_published", !form.is_published)} />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#444" }}>HPに公開する</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "14px", cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}>キャンセル</button>
              <button onClick={handleSave} disabled={saving || !form.title} style={{ background: "#1a3a2a", color: "white", border: "none", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (saving || !form.title) ? 0.5 : 1 }}>
                {saving ? "保存中..." : editing ? "変更を保存" : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リスト */}
      <div style={{ background: "white", border: "1px solid #f0f0f0", borderRadius: "16px", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>📰</div>
            <p style={{ color: "#888", margin: 0 }}>お知らせがありません</p>
          </div>
        ) : (filtered ?? []).map((news, i) => {
          const cat = CATEGORIES.find(c => c.value === news.category);
          return (
            <div key={news.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #f5f5f5" : "none", background: "white" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: cat?.bg, color: cat?.color }}>{cat?.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: news.is_published ? "#eaf3de" : "#f5f5f5", color: news.is_published ? "#3b6d11" : "#999" }}>
                    {news.is_published ? "公開中" : "下書き"}
                  </span>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{news.title}</div>
                <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{news.published_at ? new Date(news.published_at).toLocaleDateString("ja-JP") : "未公開"}</div>
              </div>
              <Toggle on={news.is_published} onClick={() => togglePublish(news)} />
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button onClick={() => openEdit(news)} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}>編集</button>
                <button onClick={() => handleDelete(news.id)} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid #fce4e4", background: "#fff5f5", color: "#c0392b", fontFamily: "inherit" }}>削除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
