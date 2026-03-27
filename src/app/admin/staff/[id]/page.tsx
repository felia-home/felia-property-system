"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StaffDetail {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  license_number: string | null;
  is_retired: boolean;
  retired_at: string | null;
  successor_id: string | null;
  store: { id: string; name: string; store_code: string };
  _count: { properties: number };
}
interface StaffOpt { id: string; name: string; store_id: string }

const inputSt: React.CSSProperties = {
  border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px",
  fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const rowSt: React.CSSProperties = { display: "flex", flexDirection: "column" };

export default function StaffDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [allStaff, setAllStaff] = useState<StaffOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [successorId, setSuccessorId] = useState("");
  const [retireNote, setRetireNote] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/staff/${params.id}`),
      fetch("/api/staff"),
    ]);
    const d1 = await r1.json() as { staff: StaffDetail };
    const d2 = await r2.json() as { staff: StaffOpt[] };
    setStaff(d1.staff);
    setAllStaff((d2.staff ?? []).filter(s => s.id !== params.id));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/staff/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: staff.name, name_kana: staff.name_kana, email: staff.email, phone: staff.phone, role: staff.role, license_number: staff.license_number }),
    });
    if (res.ok) {
      setMsg("保存しました");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setError("保存に失敗しました");
    }
    setSaving(false);
  };

  const handleRetire = async () => {
    if (!successorId) { setError("引継ぎ先を選択してください"); return; }
    if (!confirm(`${staff?.name}を退職処理します。担当物件${staff?._count.properties}件が引継ぎ先に移管されます。よろしいですか？`)) return;
    setRetiring(true);
    setError("");
    const res = await fetch(`/api/staff/${params.id}/retire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ successor_id: successorId, note: retireNote }),
    });
    if (res.ok) {
      const d = await res.json() as { transferred: number };
      alert(`退職処理完了。${d.transferred}件の物件が移管されました。`);
      router.push("/admin/staff");
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "退職処理に失敗しました");
      setRetiring(false);
    }
  };

  if (!staff) return <div style={{ padding: 40, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a" }}>
          {staff.name}
          {staff.is_retired && <span style={{ marginLeft: 10, fontSize: 13, background: "#f2f1ed", color: "#888", padding: "2px 10px", borderRadius: 12 }}>退職済み</span>}
        </h1>
        <button onClick={() => router.back()} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer" }}>← 一覧へ</button>
      </div>

      {error && <div style={{ background: "#fde8e8", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {/* Basic info */}
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: "#3a2a1a" }}>基本情報</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={rowSt}>
            <label style={labelSt}>氏名</label>
            <input style={inputSt} value={staff.name} onChange={e => setStaff(s => s ? { ...s, name: e.target.value } : s)} disabled={staff.is_retired} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>読み</label>
            <input style={inputSt} value={staff.name_kana ?? ""} onChange={e => setStaff(s => s ? { ...s, name_kana: e.target.value } : s)} disabled={staff.is_retired} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>メール</label>
            <input style={inputSt} type="email" value={staff.email ?? ""} onChange={e => setStaff(s => s ? { ...s, email: e.target.value } : s)} disabled={staff.is_retired} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>電話</label>
            <input style={inputSt} value={staff.phone ?? ""} onChange={e => setStaff(s => s ? { ...s, phone: e.target.value } : s)} disabled={staff.is_retired} />
          </div>
          <div style={rowSt}>
            <label style={labelSt}>役割</label>
            <select style={inputSt} value={staff.role} onChange={e => setStaff(s => s ? { ...s, role: e.target.value } : s)} disabled={staff.is_retired}>
              <option value="agent">営業担当</option>
              <option value="manager">店長</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div style={rowSt}>
            <label style={labelSt}>宅建士証番号</label>
            <input style={inputSt} value={staff.license_number ?? ""} onChange={e => setStaff(s => s ? { ...s, license_number: e.target.value } : s)} disabled={staff.is_retired} />
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>所属店舗: {staff.store.name}（{staff.store.store_code}）　担当物件数: {staff._count.properties}件</div>
        {!staff.is_retired && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        )}
      </div>

      {/* Retirement section */}
      {!staff.is_retired && (
        <div style={{ background: "#fff7f7", border: "1px solid #fcc", padding: 24, borderRadius: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#8c1f1f" }}>退職処理</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
            退職処理を実行すると、担当物件 <strong>{staff._count.properties}件</strong> が引継ぎ先スタッフに一括移管されます。この操作は取り消せません。
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={rowSt}>
              <label style={labelSt}>引継ぎ先スタッフ <span style={{ color: "#8c1f1f" }}>*</span></label>
              <select style={inputSt} value={successorId} onChange={e => setSuccessorId(e.target.value)}>
                <option value="">選択してください</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={rowSt}>
              <label style={labelSt}>引継ぎメモ（任意）</label>
              <input style={inputSt} value={retireNote} onChange={e => setRetireNote(e.target.value)} placeholder="退職理由など" />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleRetire} disabled={retiring}
              style={{ padding: "9px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: retiring ? "not-allowed" : "pointer", opacity: retiring ? 0.7 : 1 }}>
              {retiring ? "処理中..." : "退職処理を実行"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
