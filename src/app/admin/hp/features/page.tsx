"use client";
import { useState, useEffect } from "react";

type Feature = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM: FormState = {
  title: "", description: "", image_url: "", link_url: "", is_active: true, sort_order: 0,
};

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const load = () =>
    fetch("/api/features").then(r => r.json()).then(d => setFeatures(d.features ?? []));

  useEffect(() => { load(); }, []);

  const f = (k: keyof FormState, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await fetch(`/api/features/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/features", {
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

  const handleEdit = (feature: Feature) => {
    setEditing(feature);
    setForm({
      title: feature.title,
      description: feature.description || "",
      image_url: feature.image_url || "",
      link_url: feature.link_url || "",
      is_active: feature.is_active,
      sort_order: feature.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除してよいですか？")) return;
    await fetch(`/api/features/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (feature: Feature) => {
    await fetch(`/api/features/${feature.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...feature, is_active: !feature.is_active }),
    });
    load();
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">特集管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPトップの特集セクション（3列表示）を管理します</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM, sort_order: features.length }); setShowForm(true); }}
          className="bg-[#c9a96e] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#b8935a] transition-colors"
        >
          ＋ 特集を追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">{editing ? "特集を編集" : "新しい特集を追加"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">タイトル *</label>
              <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">説明文</label>
              <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">バナー画像URL</label>
                <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">リンク先URL</label>
                <input type="url" value={form.link_url} onChange={e => f("link_url", e.target.value)}
                  placeholder="/properties?feature=..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">表示順</label>
                <input type="number" value={form.sort_order} onChange={e => f("sort_order", Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => f("is_active", e.target.checked)} className="w-4 h-4 accent-[#1a3a2a]" />
                  <span className="text-sm font-bold text-gray-700">HP上に表示する</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading || !form.title}
                className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2d5a3e] transition-colors disabled:opacity-50">
                {loading ? "保存中..." : "保存"}
              </button>
              <button onClick={handleCancel}
                className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 特集一覧 */}
      <div className="space-y-3">
        {features.map(feature => (
          <div key={feature.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            {feature.image_url ? (
              <img src={feature.image_url} alt={feature.title}
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-xs">画像なし</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-800">{feature.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${feature.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {feature.is_active ? "表示中" : "非表示"}
                </span>
              </div>
              {feature.description && (
                <p className="text-xs text-gray-500 line-clamp-1">{feature.description}</p>
              )}
              {feature.link_url && (
                <p className="text-xs text-blue-400 mt-0.5">{feature.link_url}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleActive(feature)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                {feature.is_active ? "非表示にする" : "表示する"}
              </button>
              <button onClick={() => handleEdit(feature)}
                className="text-xs px-3 py-1.5 bg-[#1a3a2a]/10 text-[#1a3a2a] rounded-lg hover:bg-[#1a3a2a]/20">
                編集
              </button>
              <button onClick={() => handleDelete(feature.id)}
                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                削除
              </button>
            </div>
          </div>
        ))}
        {features.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">🗂️</div>
            <p className="text-gray-500">特集がまだありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
