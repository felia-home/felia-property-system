"use client";
import { useEffect, useState } from "react";

interface Branch {
  id: string;
  name: string;
  postal_code: string | null;
  address: string;
  phone: string | null;
  fax: string | null;
  access_text: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  sort_order: number;
}

interface FormState {
  name: string;
  postal_code: string;
  address: string;
  phone: string;
  fax: string;
  access_text: string;
  lat: string;
  lng: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: FormState = {
  name: "", postal_code: "", address: "", phone: "",
  fax: "", access_text: "", lat: "", lng: "",
  is_active: true, sort_order: 0,
};

export default function BranchesPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [modalMsg, setModalMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/branches");
    const d = await r.json() as { branches: Branch[] };
    setItems(d.branches ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalMsg(null); setGeocodeError(null); setShowModal(true); };
  const openEdit = (item: Branch) => {
    setEditing(item);
    setForm({
      name: item.name,
      postal_code: item.postal_code ?? "",
      address: item.address,
      phone: item.phone ?? "",
      fax: item.fax ?? "",
      access_text: item.access_text ?? "",
      lat: item.lat != null ? String(item.lat) : "",
      lng: item.lng != null ? String(item.lng) : "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setModalMsg(null);
    setGeocodeError(null);
    setShowModal(true);
  };

  const handleBranchGeocode = async () => {
    if (!form.address) {
      setGeocodeError("住所を入力してください");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(`/api/admin/geocode?address=${encodeURIComponent(form.address)}`);
      const data = await res.json() as { lat?: number; lng?: number };
      if (data.lat && data.lng) {
        setForm(f => ({ ...f, lat: data.lat!.toString(), lng: data.lng!.toString() }));
      } else {
        setGeocodeError("住所から緯度経度を取得できませんでした");
      }
    } catch {
      setGeocodeError("取得に失敗しました");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setModalMsg({ text: "支店名と住所は必須です", ok: false });
      return;
    }
    setSaving(true);
    setModalMsg(null);
    try {
      const url = editing ? `/api/admin/branches/${editing.id}` : "/api/admin/branches";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          postal_code: form.postal_code || null,
          phone: form.phone || null,
          fax: form.fax || null,
          access_text: form.access_text || null,
          lat: form.lat || null,
          lng: form.lng || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setMsg({ text: editing ? "支店情報を更新しました" : "支店を追加しました", ok: true });
        setTimeout(() => setMsg(null), 3000);
        await load();
      } else {
        const d = await res.json() as { error?: string };
        setModalMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: Branch) => {
    await fetch(`/api/admin/branches/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setMsg({ text: "削除しました", ok: true });
    setTimeout(() => setMsg(null), 3000);
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>支店管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPに表示する支店情報を管理します。</p>
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
          支店がまだ登録されていません
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["支店名", "住所", "電話番号", "表示順", "表示", "操作"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{
                  borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
                  opacity: item.is_active ? 1 : 0.6,
                }}>
                  <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.name}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", maxWidth: 220 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.address}</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>{item.phone ?? "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>{item.sort_order}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => handleToggle(item)} style={{
                      padding: "3px 12px", border: "none", borderRadius: 20, cursor: "pointer",
                      fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                      background: item.is_active ? "#dcfce7" : "#f3f4f6",
                      color: item.is_active ? "#15803d" : "#6b7280",
                    }}>
                      {item.is_active ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(item)} style={{
                        padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, background: "#fff", fontFamily: "inherit",
                      }}>編集</button>
                      <button onClick={() => setDeleteId(item.id)} style={{
                        padding: "4px 12px", border: "1px solid #fca5a5", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, color: "#b91c1c", background: "#fff", fontFamily: "inherit",
                      }}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {editing ? "支店情報を編集" : "支店を追加"}
            </h2>

            {modalMsg && (
              <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {modalMsg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>支店名 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：株式会社フェリアホーム　幡ヶ谷支店" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>郵便番号</label>
                <input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                  placeholder="151-0072" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>住所 *</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="東京都渋谷区幡ヶ谷2-1-4" style={inputSt} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleBranchGeocode}
                    disabled={geocoding}
                    style={{
                      padding: "8px 16px",
                      background: geocoding ? "#9ca3af" : "#3b82f6",
                      color: "#fff", border: "none", borderRadius: 6,
                      cursor: geocoding ? "not-allowed" : "pointer",
                      fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    {geocoding ? "取得中..." : "📍 住所から緯度経度を取得"}
                  </button>
                  {form.lat && form.lng && (
                    <span style={{ fontSize: 12, color: "#5BAD52" }}>
                      ✓ {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                    </span>
                  )}
                </div>
                {geocodeError && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4, margin: "4px 0 0" }}>
                    {geocodeError}
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>電話番号</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="03-XXXX-XXXX" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>FAX番号</label>
                <input value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))}
                  placeholder="03-XXXX-XXXX" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>アクセス方法</label>
                <textarea value={form.access_text} onChange={e => setForm(f => ({ ...f, access_text: e.target.value }))}
                  rows={4} placeholder="最寄り駅からの道順..." style={{ ...inputSt, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>緯度</label>
                  <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="35.6702" style={inputSt} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>経度</label>
                  <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                    placeholder="139.6701" style={inputSt} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>表示順</label>
                  <input type="number" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    style={inputSt} />
                </div>
                <div style={{ paddingTop: 16 }}>
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
            <p style={{ fontSize: 15, marginBottom: 20 }}>この支店を削除しますか？</p>
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
