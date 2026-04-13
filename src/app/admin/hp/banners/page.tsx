"use client";
import { useState, useEffect } from "react";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
  slot: number;
  is_active: boolean;
};

type FormState = {
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  slot: number;
  is_active: boolean;
};

const POSITIONS = [
  { value: "TOP", label: "トップバナー" },
  { value: "MIDDLE", label: "中段バナー" },
  { value: "BOTTOM", label: "下段バナー" },
];

const EMPTY_FORM: FormState = {
  title: "", image_url: "", link_url: "", position: "TOP", slot: 1, is_active: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const load = () =>
    fetch("/api/banners").then(r => r.json()).then(d => setBanners(d.banners ?? []));

  useEffect(() => { load(); }, []);

  const f = (k: keyof FormState, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await fetch(`/api/banners/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/banners", {
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

  const handleDelete = async (id: string) => {
    if (!confirm("削除してよいですか？")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    load();
  };

  const handleEdit = (banner: Banner) => {
    setEditing(banner);
    setForm({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      position: banner.position,
      slot: banner.slot,
      is_active: banner.is_active,
    });
    setShowForm(true);
  };

  const grouped = POSITIONS.map(pos => ({
    ...pos,
    items: banners.filter(b => b.position === pos.value).sort((a, b) => a.slot - b.slot),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">バナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPトップページのバナーを管理します（2カラム2行）</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="bg-[#c9a96e] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#b8935a]"
        >
          ＋ バナーを追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">{editing ? "バナーを編集" : "新しいバナー"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">管理用タイトル *</label>
              <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                placeholder="例: 無料査定バナー2024年版"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">画像URL *</label>
              <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 h-20 object-cover rounded-lg"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">リンク先URL</label>
              <input type="text" value={form.link_url} onChange={e => f("link_url", e.target.value)}
                placeholder="/contact または https://..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">位置</label>
                <select value={form.position} onChange={e => f("position", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]">
                  {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">スロット（1〜4）</label>
                <select value={form.slot} onChange={e => f("slot", Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]">
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}番目</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => f("is_active", e.target.checked)} className="w-4 h-4 accent-[#1a3a2a]" />
                  <span className="text-sm font-bold text-gray-700">表示する</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
                className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={loading || !form.title || !form.image_url}
                className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2d5a3e] disabled:opacity-50">
                {loading ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* グループ別バナー一覧 */}
      {grouped.map(group => (
        <div key={group.value} className="mb-8">
          <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-4 bg-[#c9a96e] rounded"></span>
            {group.label}
            <span className="text-xs text-gray-400">（{group.items.length}件）</span>
          </h2>
          {group.items.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              バナーなし
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {group.items.map(banner => (
                <div key={banner.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">画像なし</div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800 line-clamp-1">{banner.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0 ${banner.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {banner.is_active ? "表示中" : "非表示"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      スロット {banner.slot}
                      {banner.link_url && <span className="ml-2 text-blue-400">{banner.link_url}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(banner)}
                        className="flex-1 text-xs py-1.5 bg-[#1a3a2a]/10 text-[#1a3a2a] rounded-lg hover:bg-[#1a3a2a]/20 text-center">
                        編集
                      </button>
                      <button onClick={() => handleDelete(banner.id)}
                        className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-center">
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
