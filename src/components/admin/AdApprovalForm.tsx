"use client";
import { useState } from "react";

// AdApprovalForm — STEP2 広告承諾の取得方法・担当者・日付を記録するフォーム

type Method = "EMAIL" | "PHONE" | "SELF";

const METHOD_OPTIONS: { value: Method; label: string; icon: string; desc: string }[] = [
  { value: "EMAIL", label: "メール", icon: "📧", desc: "メールで承諾を取得" },
  { value: "PHONE", label: "電話", icon: "📞", desc: "電話で口頭承諾を取得" },
  { value: "SELF", label: "持参・FAX", icon: "📄", desc: "確認書を直接持参またはFAX" },
];

interface AdApprovalFormProps {
  propertyId: string;
  initialContact?: string;
  initialMethod?: string;
  initialDate?: string;
  onSaved?: () => void;
}

export function AdApprovalForm({
  propertyId,
  initialContact = "",
  initialMethod = "EMAIL",
  initialDate = "",
  onSaved,
}: AdApprovalFormProps) {
  const [method, setMethod] = useState<Method>((initialMethod as Method) || "EMAIL");
  const [contact, setContact] = useState(initialContact);
  const [date, setDate] = useState(
    initialDate
      ? new Date(initialDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!contact.trim()) {
      setError("担当者名を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_approval_contact: contact.trim(),
          ad_approval_method: method,
          ad_approval_date: new Date(date).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "保存に失敗しました");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e0deda",
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#706e68",
          letterSpacing: ".06em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        📋 広告承諾の取得記録
      </div>

      {/* Method toggle */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#5a4a3a",
            display: "block",
            marginBottom: 8,
          }}
        >
          承諾方法
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {METHOD_OPTIONS.map((opt) => {
            const active = method === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: `2px solid ${active ? "#234f35" : "#e0deda"}`,
                  background: active ? "#f0f7f3" : "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all .15s",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 3 }}>{opt.icon}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#234f35" : "#5a4a3a",
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact person */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#5a4a3a",
            display: "block",
            marginBottom: 6,
          }}
        >
          承諾取得先 担当者名 <span style={{ color: "#e65100" }}>*</span>
        </label>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="田中様"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #e0deda",
            borderRadius: 7,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>

      {/* Date */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#5a4a3a",
            display: "block",
            marginBottom: 6,
          }}
        >
          承諾取得日
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            border: "1px solid #e0deda",
            borderRadius: 7,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: 7,
            padding: "8px 12px",
            fontSize: 12,
            color: "#c62828",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "9px 20px",
          borderRadius: 8,
          background: saved ? "#2e7d32" : saving ? "#aaa" : "#234f35",
          color: "#fff",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "background .2s",
        }}
      >
        {saved ? "✅ 保存しました" : saving ? "保存中..." : "💾 承諾記録を保存する"}
      </button>
    </div>
  );
}
