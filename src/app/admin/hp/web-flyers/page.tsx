"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

interface WebFlyer {
  id: string;
  name: string;
  distribute_month: string;
  front_image_url: string | null;
  back_image_url: string | null;
  pdf_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface FormState {
  name: string;
  distribute_month: string;
  front_image_url: string;
  back_image_url: string;
  pdf_url: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: FormState = {
  name: "", distribute_month: "",
  front_image_url: "", back_image_url: "", pdf_url: "",
  is_active: true, sort_order: 0,
};

export default function WebFlyersPage() {
  const [items, setItems] = useState<WebFlyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WebFlyer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [modalMsg, setModalMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/web-flyers");
    const d = await r.json() as { flyers: WebFlyer[] };
    setItems(d.flyers ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalMsg(null); setShowModal(true); };
  const openEdit = (item: WebFlyer) => {
    setEditing(item);
    setForm({
      name: item.name,
      distribute_month: item.distribute_month,
      front_image_url: item.front_image_url ?? "",
      back_image_url: item.back_image_url ?? "",
      pdf_url: item.pdf_url ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setModalMsg(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setModalMsg(null);
    try {
      const url = editing ? `/api/admin/web-flyers/${editing.id}` : "/api/admin/web-flyers";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          front_image_url: form.front_image_url || null,
          back_image_url: form.back_image_url || null,
          pdf_url: form.pdf_url || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        await load();
      } else {
        const d = await res.json() as { error?: string };
        setModalMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: WebFlyer) => {
    await fetch(`/api/admin/web-flyers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/web-flyers/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  const handleGeneratePdf = async (id: string) => {
    setGeneratingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/web-flyers/${id}/generate-pdf`, { method: "POST" });
      const d = await res.json() as { success?: boolean; pdf_url?: string; error?: string };
      if (d.success) {
        setMsg({ text: "PDFを生成しました", ok: true });
        setTimeout(() => setMsg(null), 4000);
        await load();
      } else {
        setMsg({ text: d.error ?? "PDF生成に失敗しました", ok: false });
      }
    } catch {
      setMsg({ text: "通信エラーが発生しました", ok: false });
    } finally {
      setGeneratingId(null);
    }
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>WEBチラシ管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPに掲載するWEBチラシを管理します。</p>
        </div>
        <button onClick={openAdd} style={{
          padding: "10px 20px", background: "#5BAD52", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
        }}>
          + 新規追加
        </button>
      </div>

      {msg && (
        <div style={{
          padding: "10px 16px", marginBottom: 20, borderRadius: 8, fontSize: 13,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#15803d" : "#b91c1c",
          border: `1px solid ${msg.ok ? "#86efac" : "#fca5a5"}`,
        }}>
          {msg.ok ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", background: "#f9fafb", borderRadius: 12 }}>
          WEBチラシがまだありません
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
              padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              opacity: item.is_active ? 1 : 0.6,
            }}>
              {item.front_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.front_image_url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />
              ) : (
                <div style={{ width: "100%", height: 140, background: "#f3f4f6", borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                  画像なし
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.distribute_month}</div>
              {item.pdf_url && (
                <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563eb", display: "block", marginTop: 4 }}>
                  PDFを開く
                </a>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
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
                {item.front_image_url && item.back_image_url && (
                  <button
                    onClick={() => handleGeneratePdf(item.id)}
                    disabled={generatingId === item.id}
                    style={{
                      padding: "4px 12px", border: "1px solid #bfdbfe", borderRadius: 6,
                      cursor: generatingId === item.id ? "not-allowed" : "pointer",
                      fontSize: 12, color: "#1d4ed8", background: "#eff6ff", fontFamily: "inherit",
                    }}>
                    {generatingId === item.id ? "生成中..." : "PDF生成"}
                  </button>
                )}
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
              {editing ? "WEBチラシを編集" : "WEBチラシを追加"}
            </h2>

            {modalMsg && (
              <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {modalMsg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>チラシ名 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：2026年4月号" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>配布時期 *</label>
                <input value={form.distribute_month} onChange={e => setForm(f => ({ ...f, distribute_month: e.target.value }))}
                  placeholder="例：2026年4月" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>チラシ表</label>
                <ImageUploader folder="flyers" currentUrl={form.front_image_url || undefined}
                  onUpload={url => setForm(f => ({ ...f, front_image_url: url }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>チラシ裏</label>
                <ImageUploader folder="flyers" currentUrl={form.back_image_url || undefined}
                  onUpload={url => setForm(f => ({ ...f, back_image_url: url }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>PDF URL</label>
                <input value={form.pdf_url} onChange={e => setForm(f => ({ ...f, pdf_url: e.target.value }))}
                  placeholder="https://..." style={inputSt} />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  表・裏画像を設定後に保存し、「PDF生成」ボタンで自動生成することもできます
                </div>
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
              <button onClick={() => { setShowModal(false); setModalMsg(null); }} style={{
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
            <p style={{ fontSize: 15, marginBottom: 20 }}>このWEBチラシを削除しますか？</p>
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
