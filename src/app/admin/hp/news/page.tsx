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
  { value: "NEWS", label: "お知らせ" },
  { value: "PROPERTY", label: "物件情報" },
  { value: "EVENT", label: "イベント・販売会" },
];

const EMPTY_FORM: FormState = { title: "", content: "", category: "NEWS", is_published: false };

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const load = () =>
    fetch("/api/news").then(r => r.json()).then(d => setNewsList(d.news ?? []));

  useEffect(() => { load(); }, []);

  const f = (k: keyof FormState, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await fetch(`/api/news/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setEditing(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setLoading(false);
    load();
  };

  const handleEdit = (news: NewsItem) => {
    setEditing(news);
    setForm({ title: news.title, content: news.content, category: news.category, is_published: news.is_published });
    setShowForm(true);
  };

  const togglePublish = async (news: NewsItem) => {
    await fetch(`/api/news/${news.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...news, is_published: !news.is_published }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除してよいですか？")) return;
    await fetch(`/api/news/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">お知らせ管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPのNews・新着物件のお知らせを管理します</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="bg-[#c9a96e] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#b8935a]"
        >
          ＋ 新しいお知らせ
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">{editing ? "お知らせを編集" : "新しいお知らせ"}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">タイトル *</label>
                <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">カテゴリ</label>
                <select value={form.category} onChange={e => f("category", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">本文</label>
              <textarea value={form.content} onChange={e => f("content", e.target.value)} rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a] resize-none" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => f("is_published", e.target.checked)} className="w-4 h-4 accent-[#1a3a2a]" />
                <span className="text-sm font-bold text-gray-700">HPに公開する</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                  className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50">
                  キャンセル
                </button>
                <button onClick={handleSave} disabled={loading || !form.title}
                  className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2d5a3e] disabled:opacity-50">
                  {loading ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 一覧 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {newsList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📰</div>
            <p className="text-gray-500">お知らせがまだありません</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["タイトル", "カテゴリ", "状態", "公開日", ""].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newsList.map(news => (
                <tr key={news.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-800 max-w-xs">
                    <div className="line-clamp-1">{news.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {CATEGORIES.find(c => c.value === news.category)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${news.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {news.is_published ? "公開中" : "下書き"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {news.published_at ? new Date(news.published_at).toLocaleDateString("ja-JP") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => togglePublish(news)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap">
                        {news.is_published ? "非公開に" : "公開する"}
                      </button>
                      <button onClick={() => handleEdit(news)}
                        className="text-xs px-3 py-1.5 bg-[#1a3a2a]/10 text-[#1a3a2a] rounded-lg hover:bg-[#1a3a2a]/20">
                        編集
                      </button>
                      <button onClick={() => handleDelete(news.id)}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
