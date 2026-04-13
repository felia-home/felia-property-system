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

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{
    width: "44px", height: "24px", borderRadius: "100px", cursor: "pointer",
    background: on ? "#1a3a2a" : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0,
  }}>
    <div style={{
      position: "absolute", top: "3px", width: "18px", height: "18px",
      borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      transition: "left 0.2s", left: on ? "23px" : "3px",
    }} />
  </div>
);

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", link_url: "", is_active: true, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/features").then(r => r.json()).then((d: { features?: Feature[] }) => setFeatures(d.features ?? []));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", image_url: "", link_url: "", is_active: true, sort_order: features.length });
    setShowForm(true);
  };
  const openEdit = (feat: Feature) => {
    setEditing(feat);
    setForm({ title: feat.title, description: feat.description ?? "", image_url: feat.image_url ?? "", link_url: feat.link_url ?? "", is_active: feat.is_active, sort_order: feat.sort_order });
    setShowForm(true);
  };
  const handleSave = async () => {
    setSaving(true);
    const url = editing ? `/api/features/${editing.id}` : "/api/features";
    await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setShowForm(false); setEditing(null); load();
  };
  const toggleActive = async (feat: Feature) => {
    await fetch(`/api/features/${feat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...feat, is_active: !feat.is_active }) });
    load();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/features/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ padding: "32px", maxWidth: "860px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1a1a1a" }}>特集管理</h1>
          <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>HPトップの特集セクション（3列表示）を管理します</p>
        </div>
        <button onClick={openNew} style={{
          background: "#1a3a2a", color: "white", border: "none", borderRadius: "12px",
          padding: "10px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>＋ 特集を追加</button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{editing ? "特集を編集" : "新しい特集"}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999", lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "タイトル", key: "title", placeholder: "例: 城南エリア特集", required: true },
                { label: "リンク先URL", key: "link_url", placeholder: "/properties?area=johnan" },
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
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>説明文</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>表示順</label>
                  <input type="number" value={form.sort_order} onChange={e => f("sort_order", Number(e.target.value))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
                  <Toggle on={form.is_active} onClick={() => f("is_active", !form.is_active)} />
                  <span style={{ fontSize: "13px", color: "#444" }}>HP表示</span>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "6px" }}>バナー画像URL</label>
              <input type="url" value={form.image_url} onChange={e => f("image_url", e.target.value)}
                placeholder="https://..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", marginBottom: "10px", boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ border: "1px solid #e8e8e8", borderRadius: "12px", overflow: "hidden", aspectRatio: "16/9", background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#bbb" }}>
                    <div style={{ fontSize: "32px" }}>🖼</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>URLを入力するとプレビュー表示</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f0f0f0", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "14px", cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleSave} disabled={saving || !form.title} style={{
              background: "#1a3a2a", color: "white", border: "none", borderRadius: "10px",
              padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              opacity: (saving || !form.title) ? 0.5 : 1,
            }}>{saving ? "保存中..." : editing ? "変更を保存" : "特集を追加"}</button>
          </div>
        </div>
      )}

      {/* リスト */}
      {features.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "white", border: "1px solid #f0f0f0", borderRadius: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗂</div>
          <p style={{ color: "#888", marginBottom: "16px" }}>特集がまだありません</p>
          <button onClick={openNew} style={{ background: "#1a3a2a", color: "white", border: "none", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            最初の特集を作成する
          </button>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #f0f0f0", borderRadius: "16px", overflow: "hidden" }}>
          {(features ?? []).map((feat, i) => (
            <div key={feat.id} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px",
              borderBottom: i < features.length - 1 ? "1px solid #f5f5f5" : "none",
              background: "white",
            }}>
              <div style={{ color: "#ccc", fontSize: "18px", cursor: "grab", flexShrink: 0 }}>⠿</div>
              <div style={{ width: "64px", height: "44px", borderRadius: "8px", background: "#f5f5f5", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {feat.image_url
                  ? <img src={feat.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "10px", color: "#bbb" }}>なし</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feat.title}</div>
                <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feat.link_url ?? "リンクなし"}</div>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "100px", background: feat.is_active ? "#eaf3de" : "#f5f5f5", color: feat.is_active ? "#3b6d11" : "#999", flexShrink: 0 }}>
                {feat.is_active ? "公開中" : "非表示"}
              </div>
              <Toggle on={feat.is_active} onClick={() => toggleActive(feat)} />
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button onClick={() => openEdit(feat)} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid #e0e0e0", background: "white", color: "#444", fontFamily: "inherit" }}>編集</button>
                <button onClick={() => handleDelete(feat.id)} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid #fce4e4", background: "#fff5f5", color: "#c0392b", fontFamily: "inherit" }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
