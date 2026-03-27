"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StoreOpt { id: string; name: string; store_code: string }

const inputSt: React.CSSProperties = {
  border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px",
  fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const rowSt: React.CSSProperties = { display: "flex", flexDirection: "column" };

export default function StaffNewPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    store_id: "", name: "", name_kana: "", email: "",
    phone: "", role: "agent", license_number: "",
  });

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then((d: { stores: StoreOpt[] }) => setStores(d.stores ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store_id || !form.name) { setError("店舗と氏名は必須です"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/admin/staff");
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "作成に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a", marginBottom: 24 }}>スタッフ追加</h1>
      {error && <div style={{ background: "#fde8e8", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={rowSt}>
          <label style={labelSt}>担当店舗 <span style={{ color: "#8c1f1f" }}>*</span></label>
          <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))} style={inputSt} required>
            <option value="">選択してください</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}（{s.store_code}）</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>氏名 <span style={{ color: "#8c1f1f" }}>*</span></label>
            <input style={inputSt} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="山田 太郎" />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>氏名（読み）</label>
            <input style={inputSt} value={form.name_kana} onChange={e => setForm(f => ({ ...f, name_kana: e.target.value }))} placeholder="やまだ たろう" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>メールアドレス</label>
            <input style={inputSt} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="yamada@felia.jp" />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>電話番号</label>
            <input style={inputSt} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="090-0000-0000" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>役割</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputSt}>
              <option value="agent">営業担当</option>
              <option value="manager">店長</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div style={rowSt}>
            <label style={labelSt}>宅建士証番号</label>
            <input style={inputSt} value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} placeholder="第012345号" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={() => router.back()}
            style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 13, cursor: "pointer" }}>
            キャンセル
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中..." : "スタッフを追加"}
          </button>
        </div>
      </form>
    </div>
  );
}
