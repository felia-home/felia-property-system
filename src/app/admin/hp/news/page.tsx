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

type FormState = {
  title: string;
  content: string;
  category: string;
  is_published: boolean;
};

const CATEGORIES = [
  { value: "NEWS", label: "お知らせ", color: "bg-blue-50 text-blue-700" },
  { value: "PROPERTY", label: "物件情報", color: "bg-green-50 text-green-700" },
  { value: "EVENT", label: "イベント", color: "bg-orange-50 text-orange-700" },
];

const EMPTY_FORM: FormState = { title: "", content: "", category: "NEWS", is_published: false };

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const load = () =>
    fetch("/api/news").then(r => r.json()).then((d: { news?: NewsItem[] }) => setNewsList(d.news ?? []));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = (k: keyof FormState, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (n: NewsItem) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content, category: n.category, is_published: n.is_published });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const url = editing ? `/api/news/${editing.id}` : "/api/news";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    load();
  };

  const togglePublish = async (news: NewsItem) => {
    await fetch(`/api/news/${news.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...news, is_published: !news.is_published }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/news/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = newsList.filter(n =>
    filter === "all" ? true : filter === "published" ? n.is_published : !n.is_published
  );

  const publishedCount = newsList.filter(n => n.is_published).length;
  const draftCount = newsList.filter(n => !n.is_published).length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">お知らせ管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPのNewsセクションに表示されます</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#1a3a2a] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] transition-colors">
          <span className="text-lg leading-none">+</span> 新しいお知らせ
        </button>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {[
          { key: "all", label: `すべて (${newsList.length})` },
          { key: "published", label: `公開中 (${publishedCount})` },
          { key: "draft", label: `下書き (${draftCount})` },
        ].map(t => (
          <button key={t.key}
            onClick={() => setFilter(t.key as "all" | "published" | "draft")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              filter === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-800 text-lg">{editing ? "お知らせを編集" : "新しいお知らせ"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">カテゴリ</label>
                <select value={form.category} onChange={e => f("category", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">本文</label>
              <textarea value={form.content} onChange={e => f("content", e.target.value)} rows={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 resize-none" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => f("is_published", !form.is_published)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.is_published ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_published ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <span className="text-sm text-gray-700 font-bold">HPに公開する</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving || !form.title}
                className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] disabled:opacity-50 transition-colors">
                {saving ? "保存中..." : editing ? "変更を保存" : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* お知らせリスト */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📰</div>
            <p>お知らせがありません</p>
          </div>
        ) : (
          (filtered ?? []).map((news, i) => {
            const cat = CATEGORIES.find(c => c.value === news.category);
            return (
              <div key={news.id}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cat?.color}`}>{cat?.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${news.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {news.is_published ? "公開中" : "下書き"}
                    </span>
                  </div>
                  <div className="font-bold text-gray-800 text-sm truncate">{news.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {news.published_at ? new Date(news.published_at).toLocaleDateString("ja-JP") : "未公開"}
                    {news.content && ` · ${news.content.slice(0, 40)}...`}
                  </div>
                </div>

                {/* トグルスイッチ */}
                <div onClick={() => togglePublish(news)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${news.is_published ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${news.is_published ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(news)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">編集</button>
                  <button onClick={() => handleDelete(news.id)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100">削除</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
