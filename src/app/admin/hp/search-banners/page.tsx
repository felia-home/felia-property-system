"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

interface SearchBanner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  link_target: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  title: "",
  image_url: "",
  link_url: "",
  link_target: "_self",
  sort_order: 0,
  is_active: true,
};

type FormState = typeof EMPTY_FORM;

export default function SearchBannersPage() {
  const [banners, setBanners] = useState<SearchBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<SearchBanner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SearchBanner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/search-banners");
      const d = await res.json() as { banners?: SearchBanner[] };
      setBanners(d.banners ?? []);
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("add");
    setMsg(null);
  };

  const openEdit = (b: SearchBanner) => {
    setForm({
      title: b.title ?? "",
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      link_target: b.link_target,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setEditTarget(b);
    setModal("edit");
    setMsg(null);
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.image_url.trim()) {
      setMsg({ text: "画像を設定してください", ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        title: form.title.trim() || null,
        image_url: form.image_url.trim(),
        link_url: form.link_url.trim() || null,
        link_target: form.link_target,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };

      const res = modal === "add"
        ? await fetch("/api/admin/search-banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/search-banners/${editTarget!.id}`, {
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

  const handleToggle = async (b: SearchBanner) => {
    try {
      await fetch(`/api/admin/search-banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      await load();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/search-banners/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await load();
    } catch { /* silent */ } finally {
      setDeleting(false);
    }
  };

  const setF = (k: keyof FormState, v: FormState[keyof FormState]) =>
    setForm(f => ({ ...f, [k]: v }));

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e0e0e0",
    borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
    outline: "none",
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
            検索上部バナー管理
          </h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 6, margin: "6px 0 0" }}>
            物件検索エリア上部のフルワイド1カラムバナーを管理します。表示順の小さい順に表示されます。
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
          ＋ 新規追加
        </button>
      </div>

      {/* バナー一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>読み込み中...</div>
      ) : banners.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", color: "#aaa",
          background: "#fff", borderRadius: 16, border: "1px solid #f0f0f0",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🖼</div>
          <p style={{ margin: 0 }}>バナーがありません。「新規追加」から追加してください。</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {banners.map(b => (
            <div
              key={b.id}
              style={{
                background: "#fff", border: "1px solid #e8e8e8", borderRadius: 16,
                overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                opacity: b.is_active ? 1 : 0.5,
                display: "flex",
              }}
            >
              {/* 画像プレビュー */}
              <div style={{
                width: 200, flexShrink: 0, background: "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {b.image_url ? (
                  <img
                    src={b.image_url}
                    alt={b.title ?? "バナー"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span style={{ fontSize: 32, color: "#ccc" }}>🖼</span>
                )}
              </div>

              {/* 情報 */}
              <div style={{ padding: "16px 20px", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>
                      {b.title ?? <span style={{ color: "#aaa", fontStyle: "italic" }}>タイトルなし</span>}
                    </div>
                    {b.link_url && (
                      <div style={{ fontSize: 12, color: "#5BAD52", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🔗 {b.link_url}
                        <span style={{ color: "#aaa", marginLeft: 6 }}>
                          ({b.link_target === "_blank" ? "新規タブ" : "同タブ"})
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#999" }}>表示順: {b.sort_order}</div>
                  </div>

                  {/* 操作 */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 16 }}>
                    <button
                      onClick={() => handleToggle(b)}
                      style={{
                        padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        fontFamily: "inherit", cursor: "pointer", border: "none",
                        background: b.is_active ? "#5BAD52" : "#e0e0e0",
                        color: b.is_active ? "#fff" : "#888",
                      }}
                    >
                      {b.is_active ? "表示中" : "非表示"}
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      style={{
                        padding: "5px 16px", background: "#234f35", color: "#fff",
                        border: "none", borderRadius: 8, cursor: "pointer",
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                      }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(b)}
                      style={{
                        padding: "5px 14px", background: "#dc2626", color: "#fff",
                        border: "none", borderRadius: 8, cursor: "pointer",
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
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
            width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {modal === "add" ? "バナーを追加" : "バナーを編集"}
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

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>画像URL <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                value={form.image_url}
                onChange={e => setF("image_url", e.target.value)}
                placeholder="https://example.com/banner.jpg"
                style={{ ...inputSt, marginBottom: 8 }}
              />
              <ImageUploader
                folder="search-banners"
                currentUrl={form.image_url || undefined}
                label="ローカルから画像を選択"
                onUpload={url => setF("image_url", url)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>タイトル（任意）</label>
              <input
                value={form.title}
                onChange={e => setF("title", e.target.value)}
                placeholder="バナータイトル"
                style={inputSt}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>リンク先URL（任意）</label>
              <input
                value={form.link_url}
                onChange={e => setF("link_url", e.target.value)}
                placeholder="https://example.com/page"
                style={inputSt}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>リンクの開き方</label>
              <select
                value={form.link_target}
                onChange={e => setF("link_target", e.target.value)}
                style={{ ...inputSt, appearance: "none" }}
              >
                <option value="_self">同タブで開く</option>
                <option value="_blank">新規タブで開く</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>表示順</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setF("sort_order", Number(e.target.value))}
                style={{ ...inputSt, width: 120 }}
              />
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>小さい数字が先に表示されます</div>
            </div>

            <div style={{ marginBottom: 24 }}>
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
              バナーを削除
            </h2>
            <p style={{ fontSize: 14, color: "#444", margin: "0 0 20px" }}>
              「{deleteConfirm.title ?? deleteConfirm.image_url}」を削除しますか？この操作は元に戻せません。
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
