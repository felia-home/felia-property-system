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
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string>("");

  const load = () =>
    fetch("/api/features").then(r => r.json()).then((d: { features?: Feature[] }) => setFeatures(d.features ?? []));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = (k: keyof FormState, v: unknown) => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === "image_url") setPreview(String(v));
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: features.length });
    setPreview("");
    setShowForm(true);
  };

  const openEdit = (feat: Feature) => {
    setEditing(feat);
    setForm({
      title: feat.title,
      description: feat.description ?? "",
      image_url: feat.image_url ?? "",
      link_url: feat.link_url ?? "",
      is_active: feat.is_active,
      sort_order: feat.sort_order,
    });
    setPreview(feat.image_url ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const url = editing ? `/api/features/${editing.id}` : "/api/features";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    load();
  };

  const toggleActive = async (feat: Feature) => {
    await fetch(`/api/features/${feat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...feat, is_active: !feat.is_active }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/features/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">特集管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPトップの特集セクション（3列表示）を管理します</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#1a3a2a] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] transition-colors">
          <span className="text-lg leading-none">+</span> 特集を追加
        </button>
      </div>

      {/* 追加・編集フォーム */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-800 text-lg">{editing ? "特集を編集" : "新しい特集"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                  placeholder="例: 城南エリア特集"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">説明文</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3}
                  placeholder="特集の説明（HP上に表示されます）"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a] resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">リンク先URL</label>
                <input type="text" value={form.link_url} onChange={e => f("link_url", e.target.value)}
                  placeholder="/properties?area=johnan"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">表示順</label>
                  <input type="number" value={form.sort_order} onChange={e => f("sort_order", Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => f("is_active", !form.is_active)}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.is_active ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">HP上に表示</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 右カラム：画像プレビュー */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">バナー画像URL</label>
              <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a] mb-3" />
              <div className="border border-gray-200 rounded-xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="" className="w-full h-full object-cover"
                    onError={() => setPreview("")} />
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-3xl mb-2">🖼</div>
                    <div className="text-xs">URLを入力するとプレビューが表示されます</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving || !form.title}
              className="flex-1 bg-[#1a3a2a] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] disabled:opacity-50 transition-colors">
              {saving ? "保存中..." : editing ? "変更を保存" : "特集を追加"}
            </button>
          </div>
        </div>
      )}

      {/* 特集リスト */}
      {features.length === 0 && !showForm ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
          <div className="text-5xl mb-4">🗂</div>
          <p className="text-gray-500 mb-4">特集がまだありません</p>
          <button onClick={openNew} className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl text-sm font-bold">
            最初の特集を作成する
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {(features ?? []).map((feat, i) => (
            <div key={feat.id}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i < features.length - 1 ? "border-b border-gray-50" : ""}`}>
              {/* ドラッグハンドル */}
              <div className="text-gray-300 cursor-grab text-lg select-none flex-shrink-0">⠿</div>

              {/* サムネイル */}
              <div className="w-16 h-11 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {feat.image_url ? (
                  <img src={feat.image_url} alt={feat.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">なし</div>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 text-sm truncate">{feat.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {feat.link_url ?? "リンクなし"}
                  {feat.description && ` · ${feat.description.slice(0, 30)}...`}
                </div>
              </div>

              {/* 表示順 */}
              <div className="text-xs text-gray-400 flex-shrink-0 w-8 text-center">{feat.sort_order}</div>

              {/* バッジ */}
              <div className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-bold ${
                feat.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {feat.is_active ? "公開中" : "非表示"}
              </div>

              {/* トグルスイッチ */}
              <div
                onClick={() => toggleActive(feat)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${feat.is_active ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${feat.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>

              {/* アクション */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(feat)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                  編集
                </button>
                <button onClick={() => handleDelete(feat.id)}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
