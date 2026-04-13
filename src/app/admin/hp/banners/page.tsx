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
  { value: "TOP", label: "上段" },
  { value: "MIDDLE", label: "中段" },
  { value: "BOTTOM", label: "下段" },
];

const EMPTY_FORM: FormState = {
  title: "", image_url: "", link_url: "", position: "TOP", slot: 1, is_active: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/banners").then(r => r.json()).then((d: { banners?: Banner[] }) => setBanners(d.banners ?? []));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = (k: keyof FormState, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = (position = "TOP", slot = 1) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, position, slot });
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      position: b.position,
      slot: b.slot,
      is_active: b.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const url = editing ? `/api/banners/${editing.id}` : "/api/banners";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (b: Banner) => {
    await fetch(`/api/banners/${b.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, is_active: !b.is_active }),
    });
    load();
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">バナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">HPトップページのバナーを管理します（2カラム）</p>
        </div>
        <button onClick={() => openNew()}
          className="flex items-center gap-2 bg-[#1a3a2a] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] transition-colors">
          <span className="text-lg leading-none">+</span> バナーを追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-800 text-lg">{editing ? "バナーを編集" : "新しいバナー"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">管理用タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => f("title", e.target.value)}
                  placeholder="例: 無料査定バナー2024"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">リンク先URL</label>
                <input type="text" value={form.link_url} onChange={e => f("link_url", e.target.value)}
                  placeholder="/assessment"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">位置</label>
                  <select value={form.position} onChange={e => f("position", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30">
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">スロット</label>
                  <select value={form.slot} onChange={e => f("slot", Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30">
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}番目</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <div onClick={() => f("is_active", !form.is_active)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.is_active ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </div>
                <span className="text-sm text-gray-700">HP上に表示する</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">画像URL <span className="text-red-400">*</span></label>
              <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/30 focus:border-[#1a3a2a] mb-3" />
              <div className="border border-gray-200 rounded-xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-3xl mb-1">🖼</div>
                    <div className="text-xs">画像URLを入力</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 justify-end">
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving || !form.title || !form.image_url}
              className="bg-[#1a3a2a] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2d5a3e] disabled:opacity-50 transition-colors">
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      )}

      {/* スロット表示 */}
      {POSITIONS.map(pos => {
        const posItems = banners.filter(b => b.position === pos.value).sort((a, b) => a.slot - b.slot);
        const allSlots = [1, 2, 3, 4].map(slot => ({
          slot,
          banner: posItems.find(b => b.slot === slot) ?? null,
        }));

        return (
          <div key={pos.value} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#c9a96e] rounded-full"></div>
              <h2 className="font-bold text-gray-700">{pos.label}バナー</h2>
              <span className="text-xs text-gray-400">（{posItems.length}/4スロット使用中）</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {allSlots.map(({ slot, banner }) => (
                <div key={slot} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  banner ? "border-gray-100 bg-white" : "border-dashed border-gray-200 bg-gray-50"
                }`}>
                  {banner ? (
                    <>
                      <div className="relative aspect-video overflow-hidden">
                        {banner.image_url ? (
                          <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">画像なし</div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                          スロット {slot}
                        </div>
                        <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold ${
                          banner.is_active ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                        }`}>
                          {banner.is_active ? "表示中" : "非表示"}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-bold text-gray-800 text-sm mb-0.5 truncate">{banner.title}</div>
                        {banner.link_url && <div className="text-xs text-blue-400 truncate">{banner.link_url}</div>}
                        <div className="flex gap-2 mt-3 items-center">
                          <div onClick={() => toggleActive(banner)}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${banner.is_active ? "bg-[#1a3a2a]" : "bg-gray-200"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${banner.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <button onClick={() => openEdit(banner)}
                            className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center">
                            編集
                          </button>
                          <button onClick={() => handleDelete(banner.id)}
                            className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-center">
                            削除
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="text-gray-300 text-2xl">+</div>
                      <div className="text-xs text-gray-400">スロット {slot}（空き）</div>
                      <button onClick={() => openNew(pos.value, slot)}
                        className="text-xs px-4 py-1.5 border border-gray-300 text-gray-500 rounded-lg hover:bg-white hover:text-gray-700 transition-colors">
                        バナーを設定
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
