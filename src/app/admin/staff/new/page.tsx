"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS, Permission } from "@/lib/permissions";

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
    store_id: "",
    name: "",
    name_kana: "",
    permission: "AGENT",
    email_work: "",
    tel_mobile: "",
    employment_type: "FULLTIME",
    hire_date: "",
  });

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then((d: { stores: StoreOpt[] }) => setStores(d.stores ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError("氏名は必須です"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        store_id: form.store_id || null,
        name: form.name,
        name_kana: form.name_kana || null,
        permission: form.permission,
        email_work: form.email_work || null,
        tel_mobile: form.tel_mobile || null,
        employment_type: form.employment_type || null,
        hire_date: form.hire_date || null,
      };
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json() as { staff?: { id: string }; error?: string };
      if (res.ok && d.staff?.id) {
        router.push(`/admin/staff/${d.staff.id}`);
      } else {
        setError(d.error ?? "作成に失敗しました");
        setSaving(false);
      }
    } catch {
      setError("通信エラーが発生しました");
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 620, margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "inherit" }}>← スタッフ一覧</button>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1c1b18", marginBottom: 24 }}>新規スタッフ登録</h1>

      {error && <div style={{ background: "#fde8e8", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e0deda" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>氏名 <span style={{ color: "#8c1f1f" }}>*</span></label>
            <input style={inputSt} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="山田 太郎" />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>氏名（カナ）</label>
            <input style={inputSt} value={form.name_kana} onChange={e => setForm(f => ({ ...f, name_kana: e.target.value }))} placeholder="やまだ たろう" />
          </div>
        </div>

        <div style={rowSt}>
          <label style={labelSt}>権限 <span style={{ color: "#8c1f1f" }}>*</span></label>
          <select value={form.permission} onChange={e => setForm(f => ({ ...f, permission: e.target.value }))} style={inputSt}>
            {(Object.keys(PERMISSIONS) as Permission[]).map(p => (
              <option key={p} value={p}>{PERMISSIONS[p].label}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{PERMISSIONS[form.permission as Permission]?.description}</div>
        </div>

        <div style={rowSt}>
          <label style={labelSt}>所属店舗</label>
          {stores.length === 0 ? (
            <div style={{ padding: "12px 16px", background: "#fff8e1", border: "1px solid #f39c12", borderRadius: 8, fontSize: 13, color: "#8a5200" }}>
              ⚠️ 店舗が登録されていません。
              <a href="/admin/settings" style={{ color: "#1565c0", marginLeft: 4 }}>会社・店舗設定から店舗を登録してください</a>
            </div>
          ) : (
            <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))} style={inputSt}>
              <option value="">未設定</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}（{s.store_code}）</option>)}
            </select>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>業務用メール</label>
            <input style={inputSt} type="email" value={form.email_work} onChange={e => setForm(f => ({ ...f, email_work: e.target.value }))} placeholder="yamada@felia.jp" />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>業務用携帯</label>
            <input style={inputSt} value={form.tel_mobile} onChange={e => setForm(f => ({ ...f, tel_mobile: e.target.value }))} placeholder="090-0000-0000" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={rowSt}>
            <label style={labelSt}>入社日</label>
            <input style={inputSt} type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>雇用形態</label>
            <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} style={inputSt}>
              <option value="FULLTIME">正社員</option>
              <option value="PARTTIME">パート・アルバイト</option>
              <option value="CONTRACT">契約社員</option>
              <option value="DISPATCH">派遣</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#888", background: "#f7f6f2", borderRadius: 7, padding: "8px 12px" }}>
          ※ 登録後の詳細画面から資格・スキル・個人情報などを追加入力できます
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={() => router.back()}
            style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            キャンセル
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
            {saving ? "保存中..." : "登録して詳細画面へ →"}
          </button>
        </div>
      </form>
    </div>
  );
}
