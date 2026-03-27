"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, INITIAL_FORM, formToBody,
} from "@/components/admin/property-form-tabs";

export default function NewPropertyPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.price || !form.city) {
      setError("価格と市区町村は必須です");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました"); return; }
      router.push(`/admin/properties/${data.property.id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 28 }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#f7f6f2", borderBottom: "1px solid #e0deda",
        marginBottom: 20, paddingBottom: 14, paddingTop: 4,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>← 物件一覧</button>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>物件新規登録</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {error && <span style={{ fontSize: 12, color: "#8c1f1f" }}>{error}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {saving ? "登録中..." : "登録する"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        <PropertyFormTabs tab={tab} setTab={setTab} form={form} setForm={setForm} />
      </div>
    </div>
  );
}
