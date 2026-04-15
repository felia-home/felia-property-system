"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

interface SaleResult {
  id: string;
  year_month: string;
  area: string;
  property_type: string;
  comment: string | null;
  image_url_1: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  is_active: boolean;
  sort_order: number;
}

interface FormState {
  year_month: string;
  area: string;
  property_type: string;
  comment: string;
  image_url_1: string;
  image_url_2: string;
  image_url_3: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: FormState = {
  year_month: "", area: "", property_type: "マンション",
  comment: "", image_url_1: "", image_url_2: "", image_url_3: "",
  is_active: true, sort_order: 0,
};

const PROPERTY_TYPES = ["マンション", "戸建て", "土地", "その他"];

export default function SaleResultsPage() {
  const [items, setItems] = useState<SaleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SaleResult | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/sale-results");
    const d = await r.json() as { results: SaleResult[] };
    setItems(d.results ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (item: SaleResult) => {
    setEditing(item);
    setForm({
      year_month: item.year_month,
      area: item.area,
      property_type: item.property_type,
      comment: item.comment ?? "",
      image_url_1: item.image_url_1 ?? "",
      image_url_2: item.image_url_2 ?? "",
      image_url_3: item.image_url_3 ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const url = editing ? `/api/admin/sale-results/${editing.id}` : "/api/admin/sale-results";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image_url_1: form.image_url_1 || null,
          image_url_2: form.image_url_2 || null,
          image_url_3: form.image_url_3 || null,
          comment: form.comment || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        await load();
      } else {
        const d = await res.json() as { error?: string };
        setMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: SaleResult) => {
    await fetch(`/api/admin/sale-results/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/sale-results/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit",
  };

  if (loading) return <div style={{ padding: 32, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>売却実績管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPに掲載する売却実績を管理します。</p>
        </div>
        <button onClick={openAdd} style={{
          padding: "10px 20px", background: "#5BAD52", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
        }}>
          + 新規追加
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", background: "#f9fafb", borderRadius: 12 }}>
          売却実績がまだありません
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
              padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              opacity: item.is_active ? 1 : 0.6,
            }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[item.image_url_1, item.image_url_2, item.image_url_3].map((url, i) => url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />
                ) : null)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{item.year_month}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.area} / {item.property_type}</div>
              {item.comment && (
                <div style={{ fontSize: 12, color: "#374151", marginTop: 6, lineHeight: 1.5 }}>{item.comment}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                <button onClick={() => handleToggle(item)} style={{
                  padding: "4px 12px", border: "none", borderRadius: 6, cursor: "pointer",
                  fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  background: item.is_active ? "#dcfce7" : "#f3f4f6",
                  color: item.is_active ? "#15803d" : "#6b7280",
                }}>
                  {item.is_active ? "ON" : "OFF"}
                </button>
                <button onClick={() => openEdit(item)} style={{
                  padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 6,
                  cursor: "pointer", fontSize: 12, background: "#fff", fontFamily: "inherit",
                }}>編集</button>
                <button onClick={() => setDeleteId(item.id)} style={{
                  padding: "4px 12px", border: "1px solid #fca5a5", borderRadius: 6,
                  cursor: "pointer", fontSize: 12, color: "#b91c1c", background: "#fff", fontFamily: "inherit",
                }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 560,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, margin: "0 0 20px" }}>
              {editing ? "売却実績を編集" : "売却実績を追加"}
            </h2>

            {msg && (
              <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {msg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>配信年月 *</label>
                <input value={form.year_month} onChange={e => setForm(f => ({ ...f, year_month: e.target.value }))}
                  placeholder="例：2026年4月" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>エリア *</label>
                <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  placeholder="例：大田区" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>物件種別 *</label>
                <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
                  style={inputSt}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>コメント</label>
                <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  rows={3} style={{ ...inputSt, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>画像1</label>
                <ImageUploader folder="sale-results" currentUrl={form.image_url_1 || undefined}
                  onUpload={url => setForm(f => ({ ...f, image_url_1: url }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>画像2</label>
                <ImageUploader folder="sale-results" currentUrl={form.image_url_2 || undefined}
                  onUpload={url => setForm(f => ({ ...f, image_url_2: url }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>画像3</label>
                <ImageUploader folder="sale-results" currentUrl={form.image_url_3 || undefined}
                  onUpload={url => setForm(f => ({ ...f, image_url_3: url }))} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>表示順</label>
                  <input type="number" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    style={inputSt} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    表示ON
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setMsg(null); }} style={{
                padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: 8,
                cursor: "pointer", fontSize: 14, background: "#fff", fontFamily: "inherit",
              }}>キャンセル</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", background: saving ? "#9ca3af" : "#5BAD52",
                color: "#fff", border: "none", borderRadius: 8,
                cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 360 }}>
            <p style={{ fontSize: 15, marginBottom: 20 }}>この売却実績を削除しますか？</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{
                padding: "8px 20px", border: "1px solid #d1d5db", borderRadius: 8,
                cursor: "pointer", fontSize: 14, background: "#fff", fontFamily: "inherit",
              }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                padding: "8px 20px", background: "#dc2626", color: "#fff",
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit",
              }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
