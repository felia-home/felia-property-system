"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

interface AreaSetting {
  id: string;
  area_name: string;
  area_type: string;
  image_url: string | null;
  description: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  area_name: "",
  area_type: "ward",
  image_url: "",
  description: "",
  link_url: "",
  is_active: true,
  sort_order: 0,
};

type FormState = typeof EMPTY_FORM;

const AREA_TYPE_BADGE: Record<string, React.CSSProperties> = {
  ward: { background: "#dcfce7", color: "#15803d" },
  city: { background: "#dbeafe", color: "#1d4ed8" },
};

const AREA_TYPE_LABEL: Record<string, string> = {
  ward: "区",
  city: "市",
};

export default function AreasPage() {
  const [areas, setAreas] = useState<AreaSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<AreaSetting | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AreaSetting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/areas");
      const d = await res.json() as { areas?: AreaSetting[] };
      setAreas(d.areas ?? []);
    } catch {
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, sort_order: areas.length });
    setEditTarget(null);
    setModal("add");
    setMsg(null);
  };

  const openEdit = (a: AreaSetting) => {
    setForm({
      area_name: a.area_name,
      area_type: a.area_type,
      image_url: a.image_url ?? "",
      description: a.description ?? "",
      link_url: a.link_url ?? "",
      is_active: a.is_active,
      sort_order: a.sort_order,
    });
    setEditTarget(a);
    setModal("edit");
    setMsg(null);
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.area_name.trim()) {
      setMsg({ text: "エリア名を入力してください", ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        area_name: form.area_name.trim(),
        area_type: form.area_type,
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        link_url: form.link_url.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
      };

      const res = modal === "add"
        ? await fetch("/api/admin/areas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/areas/${editTarget!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        await load();
        closeModal();
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

  const handleToggle = async (a: AreaSetting) => {
    try {
      await fetch(`/api/admin/areas/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !a.is_active }),
      });
      await load();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/areas/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await load();
    } catch { /* silent */ } finally {
      setDeleting(false);
    }
  };

  const setF = (k: keyof FormState, v: FormState[keyof FormState]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e0e0e0",
    borderRadius: 8, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  };
  const labelSt: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4,
  };

  return (
    <div style={{ padding: "32px", maxWidth: "960px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            エリア管理
          </h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 6, margin: "6px 0 0" }}>
            HPのエリア一覧ページに表示するエリアを管理します。表示順の小さい順に表示されます。
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: "10px 22px", background: "#5BAD52", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit", flexShrink: 0,
          }}
        >
          ＋ エリアを追加
        </button>
      </div>

      {/* エリア一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>読み込み中...</div>
      ) : areas.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", color: "#aaa",
          background: "#fff", borderRadius: 16, border: "1px solid #f0f0f0",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗺</div>
          <p style={{ margin: 0 }}>エリアがありません。「エリアを追加」から登録してください。</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", overflow: "hidden" }}>
          {areas.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px",
                borderBottom: i < areas.length - 1 ? "1px solid #f5f5f5" : "none",
                opacity: a.is_active ? 1 : 0.5,
              }}
            >
              {/* サムネイル */}
              <div style={{
                width: 64, height: 44, borderRadius: 8, background: "#f5f5f5",
                flexShrink: 0, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {a.image_url
                  ? <img src={a.image_url} alt={a.area_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <span style={{ fontSize: 10, color: "#bbb" }}>なし</span>}
              </div>

              {/* エリア名 + バッジ */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{a.area_name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                    ...AREA_TYPE_BADGE[a.area_type] ?? { background: "#f3f4f6", color: "#555" },
                  }}>
                    {AREA_TYPE_LABEL[a.area_type] ?? a.area_type}
                  </span>
                </div>
                {a.link_url && (
                  <div style={{ fontSize: 11, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🔗 {a.link_url}
                  </div>
                )}
              </div>

              {/* 表示順 */}
              <div style={{ fontSize: 12, color: "#bbb", flexShrink: 0 }}>順: {a.sort_order}</div>

              {/* ON/OFFトグル */}
              <button
                onClick={() => handleToggle(a)}
                style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer", border: "none", flexShrink: 0,
                  background: a.is_active ? "#5BAD52" : "#e0e0e0",
                  color: a.is_active ? "#fff" : "#888",
                }}
              >
                {a.is_active ? "表示中" : "非表示"}
              </button>

              {/* 操作ボタン */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(a)}
                  style={{
                    padding: "6px 14px", border: "1px solid #e0e0e0", background: "#f8f8f8",
                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    color: "#444", fontFamily: "inherit",
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => setDeleteConfirm(a)}
                  style={{
                    padding: "6px 12px", background: "#dc2626", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 追加・編集モーダル */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28,
            width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {modal === "add" ? "エリアを追加" : "エリアを編集"}
            </h2>

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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelSt}>エリア名 <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  value={form.area_name}
                  onChange={e => setF("area_name", e.target.value)}
                  placeholder="例: 渋谷区"
                  style={inputSt}
                />
              </div>
              <div>
                <label style={labelSt}>エリア種別</label>
                <select
                  value={form.area_type}
                  onChange={e => setF("area_type", e.target.value)}
                  style={{ ...inputSt, appearance: "none", background: "white" }}
                >
                  <option value="ward">区（ward）</option>
                  <option value="city">市（city）</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>画像URL</label>
              <input
                value={form.image_url}
                onChange={e => setF("image_url", e.target.value)}
                placeholder="https://example.com/area.jpg"
                style={{ ...inputSt, marginBottom: 8 }}
              />
              <ImageUploader
                folder="areas"
                currentUrl={form.image_url || undefined}
                label="ローカルから画像を選択"
                onUpload={url => setF("image_url", url)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>説明文（任意）</label>
              <textarea
                value={form.description}
                onChange={e => setF("description", e.target.value)}
                placeholder="エリアの説明"
                rows={2}
                style={{ ...inputSt, resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>リンク先URL（任意）</label>
              <input
                value={form.link_url}
                onChange={e => setF("link_url", e.target.value)}
                placeholder="/properties?area=shibuya"
                style={inputSt}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelSt}>表示順</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setF("sort_order", Number(e.target.value))}
                  style={inputSt}
                />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>小さい数字が先に表示</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setF("is_active", e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, color: "#333" }}>表示する（ON）</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px", background: saving ? "#aaa" : "#5BAD52",
                  color: "#fff", border: "none", borderRadius: 8,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                {saving ? "保存中..." : "保存する"}
              </button>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px", border: "1px solid #e0e0e0", background: "#fff",
                  borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#444",
                  fontFamily: "inherit",
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28,
            width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#dc2626" }}>
              エリアを削除
            </h2>
            <p style={{ fontSize: 14, color: "#444", margin: "0 0 20px" }}>
              「{deleteConfirm.area_name}」を削除しますか？この操作は元に戻せません。
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "10px 24px", background: deleting ? "#aaa" : "#dc2626",
                  color: "#fff", border: "none", borderRadius: 8,
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "10px 20px", border: "1px solid #e0e0e0", background: "#fff",
                  borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#444",
                  fontFamily: "inherit",
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
