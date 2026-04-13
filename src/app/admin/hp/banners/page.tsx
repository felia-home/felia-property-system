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

const POSITIONS = [
  { value: "TOP", label: "上段" },
  { value: "MIDDLE", label: "中段" },
  { value: "BOTTOM", label: "下段" },
];

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{ width: "40px", height: "22px", borderRadius: "100px", cursor: "pointer", background: on ? "#1a3a2a" : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", left: on ? "20px" : "2px" }} />
  </div>
);

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({ title: "", image_url: "", link_url: "", position: "TOP", slot: 1, is_active: true });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/banners").then(r => r.json()).then((d: { banners?: Banner[] }) => setBanners(d.banners ?? []));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = (position = "TOP", slot = 1) => { setEditing(null); setForm({ title: "", image_url: "", link_url: "", position, slot, is_active: true }); setShowForm(true); };
  const openEdit = (b: Banner) => { setEditing(b); setForm({ title: b.title, image_url: b.image_url, link_url: b.link_url ?? "", position: b.position, slot: b.slot, is_active: b.is_active }); setShowForm(true); };
  const handleSave = async () => {
    setSaving(true);
    await fetch(editing ? `/api/banners/${editing.id}` : "/api/banners", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setShowForm(false); setEditing(null); load();
  };
  const handleDelete = async (id: string) => { if (!confirm("削除しますか？")) return; await fetch(`/api/banners/${id}`, { method: "DELETE" }); load(); };
  const toggleActive = async (b: Banner) => {
    await fetch(`/api/banners/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, is_active: !b.is_active }) });
    load();
  };

  return (
    <div style={{ padding: "32px", maxWidth: "860px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1a1a1a" }}>バナー管理</h1>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>HPトップページのバナーを管理します（2カラム）</p>
        </div>
        <button onClick={() => openNew()} style={{ background: "#1a3a2a", color: "white", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          ＋ バナーを追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{editing ? "バナーを編集" : "新しいバナー"}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "管理用タイトル", key: "title", placeholder: "例: 無料査定バナー2024", required: true },
                { label: "リンク先URL", key: "link_url", placeholder: "/assessment" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>
                    {field.label}{field.required && <span style={{ color: "#e44" }}> *</span>}
                  </label>
                  <input type="text" value={(form as Record<string, unknown>)[field.key] as string}
                    onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>位置</label>
                  <select value={form.position} onChange={e => f("position", e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", background: "white", fontFamily: "inherit" }}>
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>スロット</label>
                  <select value={form.slot} onChange={e => f("slot", Number(e.target.value))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", background: "white", fontFamily: "inherit" }}>
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}番目</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Toggle on={form.is_active} onClick={() => f("is_active", !form.is_active)} />
                <span style={{ fontSize: "13px", color: "#444" }}>HP上に表示する</span>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>画像URL <span style={{ color: "#e44" }}>*</span></label>
              <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                placeholder="https://..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", marginBottom: "10px", boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ border: "1px solid #e8e8e8", borderRadius: "12px", overflow: "hidden", aspectRatio: "16/9", background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.image_url
                  ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ textAlign: "center", color: "#bbb" }}><div style={{ fontSize: "32px" }}>🖼</div><div style={{ fontSize: "12px", marginTop: "4px" }}>画像URLを入力</div></div>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f0f0f0", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "14px", cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleSave} disabled={saving || !form.title || !form.image_url} style={{ background: "#1a3a2a", color: "white", border: "none", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (saving || !form.title || !form.image_url) ? 0.5 : 1 }}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      )}

      {/* スロット表示 */}
      {POSITIONS.map(pos => {
        const allSlots = [1, 2, 3, 4].map(slot => ({
          slot,
          banner: banners.find(b => b.position === pos.value && b.slot === slot) ?? null,
        }));
        const usedCount = allSlots.filter(s => s.banner).length;
        return (
          <div key={pos.value} style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "4px", height: "20px", background: "#c9a96e", borderRadius: "2px" }} />
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#333" }}>{pos.label}バナー</h2>
              <span style={{ fontSize: "12px", color: "#aaa" }}>（{usedCount}/4スロット使用中）</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {allSlots.map(({ slot, banner }) => (
                <div key={slot} style={{ border: banner ? "1px solid #f0f0f0" : "2px dashed #e0e0e0", borderRadius: "16px", overflow: "hidden", background: banner ? "white" : "#fafafa" }}>
                  {banner ? (
                    <>
                      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                        {banner.image_url
                          ? <img src={banner.image_url} alt={banner.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>画像なし</div>}
                        <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.5)", color: "white", fontSize: "11px", padding: "2px 8px", borderRadius: "100px" }}>スロット {slot}</div>
                        <div style={{ position: "absolute", top: "8px", right: "8px", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: banner.is_active ? "#27ae60" : "#999", color: "white" }}>
                          {banner.is_active ? "表示中" : "非表示"}
                        </div>
                      </div>
                      <div style={{ padding: "12px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{banner.title}</div>
                        {banner.link_url && <div style={{ fontSize: "11px", color: "#4a90d9", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{banner.link_url}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Toggle on={banner.is_active} onClick={() => toggleActive(banner)} />
                          <button onClick={() => openEdit(banner)} style={{ flex: 1, padding: "6px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", border: "1px solid #e0e0e0", background: "#f8f8f8", color: "#444", fontFamily: "inherit" }}>編集</button>
                          <button onClick={() => handleDelete(banner.id)} style={{ flex: 1, padding: "6px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", border: "1px solid #fce4e4", background: "#fff5f5", color: "#c0392b", fontFamily: "inherit" }}>削除</button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: "8px" }}>
                      <div style={{ fontSize: "28px", color: "#ddd" }}>+</div>
                      <div style={{ fontSize: "12px", color: "#bbb" }}>スロット {slot}（空き）</div>
                      <button onClick={() => openNew(pos.value, slot)} style={{ fontSize: "12px", padding: "6px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "white", color: "#666", cursor: "pointer", fontFamily: "inherit" }}>
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
