"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

interface Staff { id: string; name: string; }

interface Testimonial {
  id: string;
  name: string;
  email: string | null;
  display_name: string;
  image_url: string | null;
  title: string;
  trigger_text: string | null;
  decision_text: string | null;
  impression_text: string | null;
  advice_text: string | null;
  final_text: string | null;
  staff_id: string | null;
  status: string;
  sort_order: number;
  staff: { name: string } | null;
}

interface FormState {
  name: string;
  email: string;
  display_name: string;
  image_url: string;
  title: string;
  trigger_text: string;
  decision_text: string;
  impression_text: string;
  advice_text: string;
  final_text: string;
  staff_id: string;
  status: string;
  sort_order: number;
}

const EMPTY: FormState = {
  name: "", email: "", display_name: "", image_url: "", title: "",
  trigger_text: "", decision_text: "", impression_text: "",
  advice_text: "", final_text: "", staff_id: "", status: "PENDING", sort_order: 0,
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: "審査待ち", bg: "#fef9c3", color: "#a16207" },
  PUBLISHED: { label: "掲載中",   bg: "#dcfce7", color: "#15803d" },
  REJECTED:  { label: "非掲載",   bg: "#fee2e2", color: "#b91c1c" },
};

type TabKey = "ALL" | "PENDING" | "PUBLISHED";

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      fetch("/api/admin/testimonials"),
      fetch("/api/staff"),
    ]);
    const tData = await tRes.json() as { testimonials: Testimonial[] };
    const sData = await sRes.json() as { staffs?: Staff[]; staff?: Staff[] };
    setItems(tData.testimonials ?? []);
    setStaffList(sData.staffs ?? sData.staff ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = tab === "ALL" ? items : items.filter(i => i.status === tab);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email ?? "",
      display_name: item.display_name,
      image_url: item.image_url ?? "",
      title: item.title,
      trigger_text: item.trigger_text ?? "",
      decision_text: item.decision_text ?? "",
      impression_text: item.impression_text ?? "",
      advice_text: item.advice_text ?? "",
      final_text: item.final_text ?? "",
      staff_id: item.staff_id ?? "",
      status: item.status,
      sort_order: item.sort_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const url = editing ? `/api/admin/testimonials/${editing.id}` : "/api/admin/testimonials";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          image_url: form.image_url || null,
          trigger_text: form.trigger_text || null,
          decision_text: form.decision_text || null,
          impression_text: form.impression_text || null,
          advice_text: form.advice_text || null,
          final_text: form.final_text || null,
          staff_id: form.staff_id || null,
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

  const handleGeneratePhoto = async () => {
    setGeneratingPhoto(true);
    setPhotoError(null);
    try {
      const res = await fetch('/api/admin/unsplash-photo');
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) {
        setPhotoError(data.error ?? '写真の取得に失敗しました');
        return;
      }
      setForm(f => ({ ...f, image_url: data.url ?? '' }));
    } catch {
      setPhotoError('通信エラーが発生しました');
    } finally {
      setGeneratingPhoto(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit",
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "ALL", label: "全件" },
    { key: "PENDING", label: "審査待ち" },
    { key: "PUBLISHED", label: "掲載中" },
  ];

  if (loading) return <div style={{ padding: 32, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>お客様の声管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPに掲載するお客様の声を管理します。</p>
        </div>
        <button onClick={openAdd} style={{
          padding: "10px 20px", background: "#5BAD52", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
        }}>
          + 新規追加
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            background: tab === t.key ? "#fff" : "transparent",
            color: tab === t.key ? "#111827" : "#6b7280",
            borderBottom: tab === t.key ? "2px solid #5BAD52" : "2px solid transparent",
          }}>{t.label}（{t.key === "ALL" ? items.length : items.filter(i => i.status === t.key).length}）</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", background: "#f9fafb", borderRadius: 12 }}>
          データがありません
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["表示名", "タイトル", "ステータス", "担当スタッフ", "操作"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const st = STATUS_LABELS[item.status] ?? STATUS_LABELS["PENDING"];
                return (
                  <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600 }}>{item.display_name}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>
                      {item.staff?.name ?? "—"}
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
                );
              })}
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
            background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 600,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, margin: "0 0 20px" }}>
              {editing ? "お客様の声を編集" : "お客様の声を追加"}
            </h2>

            {msg && (
              <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {msg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "name" as const, label: "お名前 *", ph: "田中 太郎" },
                { key: "email" as const, label: "メールアドレス", ph: "example@email.com" },
                { key: "display_name" as const, label: "表示名 *", ph: "T.Sさん" },
                { key: "title" as const, label: "タイトル *", ph: "念願のマイホームを購入できました" },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph} style={inputSt} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>画像</label>

                {/* プレビュー */}
                {form.image_url && (
                  <div style={{ marginBottom: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.image_url}
                      alt="プレビュー"
                      style={{
                        width: "100%", maxHeight: 160,
                        objectFit: "cover", borderRadius: 6,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </div>
                )}

                {/* 自動生成ボタン */}
                <button
                  type="button"
                  onClick={() => void handleGeneratePhoto()}
                  disabled={generatingPhoto}
                  style={{
                    width: "100%", padding: 10,
                    background: generatingPhoto ? "#9ca3af" : "#5BAD52",
                    color: "#fff", border: "none", borderRadius: 6,
                    cursor: generatingPhoto ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: "inherit",
                  }}
                >
                  {generatingPhoto ? "🔄 取得中..." : "🏠 内装写真を自動生成"}
                </button>

                {/* URL直接入力 */}
                <input
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://... または上のボタンで自動生成"
                  style={{ ...inputSt, marginBottom: 4 }}
                />

                {/* ローカルアップロード */}
                <ImageUploader
                  folder="testimonials"
                  currentUrl={form.image_url || undefined}
                  label="ローカルから画像をアップロード"
                  onUpload={url => setForm(f => ({ ...f, image_url: url }))}
                />

                {photoError && (
                  <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4, margin: "4px 0 0" }}>
                    ⚠ {photoError}
                  </p>
                )}
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, margin: "4px 0 0" }}>
                  ※ 写真はUnsplash提供。ボタンを押すたびに異なる内装写真が選ばれます。
                </p>
              </div>

              {[
                { key: "trigger_text" as const, label: "住宅探しのきっかけ" },
                { key: "decision_text" as const, label: "ご購入の決め手" },
                { key: "impression_text" as const, label: "フェリアホームの印象・満足度" },
                { key: "advice_text" as const, label: "これから住宅を探す人に一言" },
                { key: "final_text" as const, label: "最後に一言" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>{label}</label>
                  <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    rows={3} style={{ ...inputSt, resize: "vertical" }} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>担当スタッフ</label>
                <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                  style={inputSt}>
                  <option value="">未設定</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>ステータス</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={inputSt}>
                  <option value="PENDING">審査待ち</option>
                  <option value="PUBLISHED">掲載中</option>
                  <option value="REJECTED">非掲載</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>表示順</label>
                <input type="number" value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  style={inputSt} />
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
            <p style={{ fontSize: 15, marginBottom: 20 }}>このお客様の声を削除しますか？</p>
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
