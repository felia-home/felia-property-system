"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  description: string | null;
  updated_at: string;
}

const VARIABLES: Record<string, { key: string; desc: string }[]> = {
  private_selection_url: [
    { key: "{{customer_name}}", desc: "顧客名" },
    { key: "{{staff_name}}", desc: "担当者名" },
    { key: "{{staff_phone}}", desc: "担当者電話" },
    { key: "{{url}}", desc: "非公開物件URL" },
    { key: "{{expires_date}}", desc: "有効期限日" },
  ],
  inquiry_auto_reply: [
    { key: "{{customer_name}}", desc: "顧客名" },
    { key: "{{message}}", desc: "問い合わせ内容" },
    { key: "{{staff_name}}", desc: "担当者名" },
    { key: "{{staff_phone}}", desc: "担当者電話" },
  ],
  inquiry_notify: [
    { key: "{{customer_name}}", desc: "顧客名" },
    { key: "{{customer_email}}", desc: "顧客メール" },
    { key: "{{customer_phone}}", desc: "顧客電話" },
    { key: "{{inquiry_type}}", desc: "問い合わせ種別" },
    { key: "{{property_no}}", desc: "物件番号" },
    { key: "{{message}}", desc: "メッセージ" },
    { key: "{{via_token}}", desc: "経由（マジックリンク等）" },
  ],
};

export default function EmailTemplatesPage() {
  const { data: session } = useSession();
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    setCanEdit(["ADMIN", "SENIOR_MANAGER"].includes((session?.user as { permission?: string })?.permission ?? ""));
  }, [session]);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [previewHtml, setPreviewHtml] = useState(false);

  useEffect(() => {
    fetch("/api/email-templates")
      .then(r => r.json())
      .then((d: unknown) => Array.isArray(d) ? setTemplates(d as EmailTemplate[]) : null)
      .catch(() => {});
  }, []);

  const startEdit = (t: EmailTemplate) => {
    setEditingKey(t.template_key);
    setEditSubject(t.subject);
    setEditBodyHtml(t.body_html);
    setMsg(null);
    setPreviewHtml(false);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/email-templates/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body_html: editBodyHtml }),
      });
      if (res.ok) {
        const updated = await res.json() as EmailTemplate;
        setTemplates(prev => prev.map(t => t.template_key === key ? updated : t));
        setEditingKey(null);
        setMsg({ text: "保存しました", ok: true });
        setTimeout(() => setMsg(null), 3000);
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

  return (
    <div style={{ padding: "32px", maxWidth: "960px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          メールテンプレート管理
        </h1>
        <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
          自動送信メールの件名・本文を編集できます。
          <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: 4, fontSize: 12, margin: "0 2px" }}>{"{{変数名}}"}</code>
          はメール送信時に実際の値に置き換えられます。
        </p>
      </div>

      {msg && (
        <div style={{
          padding: "10px 16px", marginBottom: "20px", borderRadius: 8, fontSize: 13,
          background: msg.ok ? "#e8f5e9" : "#fdeaea",
          color: msg.ok ? "#2e7d32" : "#c62828",
          border: `1px solid ${msg.ok ? "#a5d6a7" : "#ffcdd2"}`,
        }}>
          {msg.ok ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      {templates.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa", background: "#fff", borderRadius: 16, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✉</div>
          <p style={{ margin: 0 }}>テンプレートがありません。DBへのSQL実行後にリロードしてください。</p>
        </div>
      )}

      {templates.map(t => {
        const vars = VARIABLES[t.template_key] ?? [];
        const isEditing = editingKey === t.template_key;

        return (
          <div key={t.template_key} style={{
            background: "#fff", border: "1px solid #e8e8e8", borderRadius: 16,
            marginBottom: 24, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            {/* ヘッダー */}
            <div style={{
              background: "#f9fafb", padding: "16px 20px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>{t.name}</div>
                {t.description && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{t.description}</div>
                )}
              </div>
              {canEdit && !isEditing && (
                <button
                  onClick={() => startEdit(t)}
                  style={{
                    padding: "6px 18px", background: "#234f35", color: "#fff",
                    border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  編集
                </button>
              )}
            </div>

            {/* 変数一覧 */}
            {vars.length > 0 && (
              <div style={{ padding: "10px 20px", background: "#fffbeb", borderBottom: "1px solid #fef3c7" }}>
                <span style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginRight: 8 }}>使用可能な変数：</span>
                {vars.map(v => (
                  <span key={v.key} title={v.desc} style={{
                    display: "inline-block", background: "#fef3c7", color: "#92400e",
                    padding: "1px 7px", borderRadius: 4, fontSize: 11, marginRight: 4,
                    fontFamily: "monospace", cursor: "default",
                  }}>{v.key}</span>
                ))}
              </div>
            )}

            {/* 本文エリア */}
            <div style={{ padding: 20 }}>
              {isEditing ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 6 }}>
                      件名
                    </label>
                    <input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      style={{
                        width: "100%", padding: "9px 12px", border: "1px solid #e0e0e0",
                        borderRadius: 8, fontSize: 14, outline: "none",
                        boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>本文（HTML）</label>
                      <button
                        onClick={() => setPreviewHtml(p => !p)}
                        style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                          border: "1px solid #e0e0e0", background: previewHtml ? "#234f35" : "#fff",
                          color: previewHtml ? "#fff" : "#444", fontFamily: "inherit",
                        }}
                      >
                        {previewHtml ? "HTMLを編集" : "プレビュー"}
                      </button>
                    </div>
                    {previewHtml ? (
                      <div
                        style={{
                          border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 16px",
                          minHeight: 200, background: "#fff", fontSize: 14,
                        }}
                        dangerouslySetInnerHTML={{ __html: editBodyHtml }}
                      />
                    ) : (
                      <textarea
                        value={editBodyHtml}
                        onChange={e => setEditBodyHtml(e.target.value)}
                        rows={14}
                        style={{
                          width: "100%", padding: "9px 12px", border: "1px solid #e0e0e0",
                          borderRadius: 8, fontSize: 12, fontFamily: "monospace",
                          outline: "none", resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleSave(t.template_key)}
                      disabled={saving}
                      style={{
                        padding: "9px 24px", background: saving ? "#aaa" : "#234f35",
                        color: "#fff", border: "none", borderRadius: 8,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                      }}
                    >
                      {saving ? "保存中..." : "保存する"}
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      style={{
                        padding: "9px 20px", border: "1px solid #e0e0e0", background: "#fff",
                        borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#444",
                        fontFamily: "inherit",
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "#444", marginBottom: 10 }}>
                    <span style={{ color: "#888", marginRight: 6 }}>件名：</span>
                    <span style={{ fontWeight: 600 }}>{t.subject}</span>
                  </div>
                  <div style={{
                    background: "#f8f8f8", border: "1px solid #f0f0f0", borderRadius: 8,
                    padding: "12px 14px", fontSize: 12, fontFamily: "monospace",
                    whiteSpace: "pre-wrap", color: "#555", maxHeight: 160, overflowY: "auto",
                  }}>
                    {t.body_html}
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>
                    最終更新：{new Date(t.updated_at).toLocaleString("ja-JP")}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
