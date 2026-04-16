"use client";
import { useState, useEffect } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  link_target: string;
  position: string;
  slot: number;
  sort_order: number;
  is_active: boolean;
  banner_type: string;
};

const BANNER_TYPES = [
  { value: "free", label: "フリーバナー（HP上段/中段/下段）" },
  { value: "search_top", label: "検索上部フルワイドバナー" },
];

const POSITIONS = [
  { value: "TOP", label: "上段" },
  { value: "MIDDLE", label: "中段" },
  { value: "BOTTOM", label: "下段" },
];

const EMPTY_FORM = {
  title: "",
  image_url: "",
  link_url: "",
  link_target: "_self",
  position: "TOP",
  slot: 1,
  sort_order: 0,
  is_active: true,
  banner_type: "free",
};

type FormState = typeof EMPTY_FORM;

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    style={{
      width: 40, height: 22, borderRadius: 100, cursor: "pointer",
      background: on ? "#1a3a2a" : "#ddd",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}
  >
    <div style={{
      position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%",
      background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      transition: "left 0.2s", left: on ? 20 : 2,
    }} />
  </div>
);

const inputSt: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0",
  borderRadius: 10, fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 6,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = () =>
    fetch("/api/banners")
      .then(r => r.json())
      .then((d: { banners?: Banner[] }) => setBanners(d.banners ?? []));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const f = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const openNew = (position = "TOP", slot = 1) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, position, slot });
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      link_target: b.link_target ?? "_self",
      position: b.position,
      slot: b.slot,
      sort_order: b.sort_order,
      is_active: b.is_active,
      banner_type: b.banner_type ?? "free",
    });
    setShowForm(true);
    setMsg(null);
  };

  const handleSave = async () => {
    if (!form.image_url.trim()) {
      setMsg({ text: "画像を設定してください", ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        title: form.title || "(無題)",
        image_url: form.image_url,
        link_url: form.link_url.trim() || null,
        link_target: form.link_target,
        position: form.position,
        slot: Number(form.slot),
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
        banner_type: form.banner_type,
      };
      const res = await fetch(
        editing ? `/api/banners/${editing.id}` : "/api/banners",
        { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        await load();
      } else {
        const d = await res.json() as { error?: string };
        setMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } catch {
      setMsg({ text: "通信エラーが発生しました", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このバナーを削除しますか？")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    await load();
  };

  const toggleActive = async (b: Banner) => {
    await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !b.is_active }),
    });
    await load();
  };

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>バナー管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPトップページのバナーを管理します（2カラム・位置/スロット）</p>
        </div>
        <button
          onClick={() => openNew()}
          style={{
            background: "#1a3a2a", color: "white", border: "none", borderRadius: 12,
            padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ＋ バナーを追加
        </button>
      </div>

      {/* フォーム（インライン展開） */}
      {showForm && (
        <div style={{
          background: "white", border: "1px solid #e8e8e8", borderRadius: 16,
          padding: 24, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              {editing ? "バナーを編集" : "新しいバナー"}
            </h2>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>×</button>
          </div>

          {msg && (
            <div style={{
              padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13,
              background: msg.ok ? "#e8f5e9" : "#fdeaea",
              color: msg.ok ? "#2e7d32" : "#c62828",
              border: `1px solid ${msg.ok ? "#a5d6a7" : "#ffcdd2"}`,
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* 左カラム：テキスト系 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelSt}>バナー種別 <span style={{ color: "#e44" }}>*</span></label>
                <select
                  value={form.banner_type}
                  onChange={e => f("banner_type", e.target.value)}
                  style={{ ...inputSt, appearance: "none", background: "white" }}
                >
                  {BANNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelSt}>管理用タイトル</label>
                <input
                  value={form.title}
                  onChange={e => f("title", e.target.value)}
                  placeholder="例: 無料査定バナー2024"
                  style={inputSt}
                />
              </div>

              <div>
                <label style={labelSt}>リンク先URL（任意）</label>
                <input
                  value={form.link_url}
                  onChange={e => f("link_url", e.target.value)}
                  placeholder="https://... または /page"
                  style={inputSt}
                />
              </div>

              <div>
                <label style={labelSt}>リンクの開き方</label>
                <select
                  value={form.link_target}
                  onChange={e => f("link_target", e.target.value)}
                  style={{ ...inputSt, appearance: "none", background: "white" }}
                >
                  <option value="_self">同タブで開く</option>
                  <option value="_blank">新規タブで開く</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelSt}>位置</label>
                  <select
                    value={form.position}
                    onChange={e => f("position", e.target.value)}
                    style={{ ...inputSt, appearance: "none", background: "white" }}
                  >
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>スロット</label>
                  <select
                    value={form.slot}
                    onChange={e => f("slot", Number(e.target.value))}
                    style={{ ...inputSt, appearance: "none", background: "white" }}
                  >
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}番目</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>表示順</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => f("sort_order", Number(e.target.value))}
                    style={inputSt}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle on={form.is_active} onClick={() => f("is_active", !form.is_active)} />
                <span style={{ fontSize: 13, color: "#444" }}>HP上に表示する</span>
              </div>
            </div>

            {/* 右カラム：画像 */}
            <div>
              <label style={labelSt}>画像 <span style={{ color: "#e44" }}>*</span></label>
              <input
                type="url"
                value={form.image_url}
                onChange={e => f("image_url", e.target.value)}
                placeholder="https://... または下からアップロード"
                style={{ ...inputSt, marginBottom: 8 }}
              />
              <ImageUploader
                folder="banners"
                currentUrl={form.image_url || undefined}
                label="ローカルから画像を選択"
                onUpload={url => f("image_url", url)}
              />
              {form.image_url && (
                <div style={{ marginTop: 10, border: "1px solid #e8e8e8", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#f8f8f8" }}>
                  <img
                    src={form.image_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid #f0f0f0", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.image_url}
              style={{
                background: "#1a3a2a", color: "white", border: "none", borderRadius: 10,
                padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", opacity: (saving || !form.image_url) ? 0.5 : 1,
              }}
            >
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
          <div key={pos.value} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 20, background: "#c9a96e", borderRadius: 2 }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#333" }}>{pos.label}バナー</h2>
              <span style={{ fontSize: 12, color: "#aaa" }}>（{usedCount}/4スロット使用中）</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {allSlots.map(({ slot, banner }) => (
                <div
                  key={slot}
                  style={{
                    border: banner ? "1px solid #f0f0f0" : "2px dashed #e0e0e0",
                    borderRadius: 16, overflow: "hidden",
                    background: banner ? "white" : "#fafafa",
                  }}
                >
                  {banner ? (
                    <>
                      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                        {banner.image_url
                          ? <img src={banner.image_url} alt={banner.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <div style={{ width: "100%", height: "100%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>画像なし</div>}
                        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 100 }}>
                          スロット {slot}
                        </div>
                        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: banner.is_active ? "#27ae60" : "#999", color: "white" }}>
                          {banner.is_active ? "表示中" : "非表示"}
                        </div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {banner.title}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                            background: banner.banner_type === "search_top" ? "#e8f0fb" : "#f0f4f0",
                            color: banner.banner_type === "search_top" ? "#2563eb" : "#4a6a4a",
                            border: `1px solid ${banner.banner_type === "search_top" ? "#bfd3f8" : "#c8d8c8"}`,
                          }}>
                            {BANNER_TYPES.find(t => t.value === banner.banner_type)?.label ?? banner.banner_type}
                          </span>
                        </div>
                        {banner.link_url && (
                          <div style={{ fontSize: 11, color: "#4a90d9", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🔗 {banner.link_url}
                            <span style={{ color: "#aaa", marginLeft: 4 }}>
                              ({banner.link_target === "_blank" ? "新規タブ" : "同タブ"})
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>表示順: {banner.sort_order}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Toggle on={banner.is_active} onClick={() => toggleActive(banner)} />
                          <button
                            onClick={() => openEdit(banner)}
                            style={{ flex: 1, padding: 6, borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid #e0e0e0", background: "#f8f8f8", color: "#444", fontFamily: "inherit" }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(banner.id)}
                            style={{ flex: 1, padding: 6, borderRadius: 8, fontSize: 12, cursor: "pointer", border: "1px solid #fce4e4", background: "#fff5f5", color: "#c0392b", fontFamily: "inherit" }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 8 }}>
                      <div style={{ fontSize: 28, color: "#ddd" }}>+</div>
                      <div style={{ fontSize: 12, color: "#bbb" }}>スロット {slot}（空き）</div>
                      <button
                        onClick={() => openNew(pos.value, slot)}
                        style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #ddd", background: "white", color: "#666", cursor: "pointer", fontFamily: "inherit" }}
                      >
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
