"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface StaffMember {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_retired: boolean;
  store: { id: string; name: string; store_code: string };
  _count: { properties: number };
}

const ROLE_LABEL: Record<string, string> = {
  agent: "営業担当",
  manager: "店長",
  admin: "管理者",
};

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/staff${showRetired ? "?include_retired=true" : ""}`);
    const data = await res.json() as { staff: StaffMember[] };
    setStaff(data.staff ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [showRetired]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a" }}>スタッフ管理</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "#5a4a3a", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={showRetired} onChange={e => setShowRetired(e.target.checked)} />
            退職者を含む
          </label>
          <Link href="/admin/staff/new" style={{
            background: "#8c1f1f", color: "#fff", padding: "8px 20px",
            borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            + スタッフ追加
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 40 }}>読み込み中...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <thead>
            <tr style={{ background: "#f8f6f3" }}>
              {["氏名","読み","店舗","役割","担当物件数","電話","メール","状態",""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #e8e4e0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#aaa" }}>スタッフが登録されていません</td></tr>
            )}
            {staff.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f2f1ed", opacity: s.is_retired ? 0.5 : 1 }}>
                <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 14 }}>
                  <Link href={`/admin/staff/${s.id}`} style={{ color: "#8c1f1f", textDecoration: "none" }}>{s.name}</Link>
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#888" }}>{s.name_kana ?? "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: 13 }}>{s.store.name}</td>
                <td style={{ padding: "10px 14px", fontSize: 12 }}>{ROLE_LABEL[s.role] ?? s.role}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{s._count.properties}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#666" }}>{s.phone ?? "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#666" }}>{s.email ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}>
                  {s.is_retired ? (
                    <span style={{ background: "#f2f1ed", color: "#888", padding: "3px 8px", borderRadius: 12, fontSize: 11 }}>退職</span>
                  ) : (
                    <span style={{ background: "#e8f5e9", color: "#2e7d32", padding: "3px 8px", borderRadius: 12, fontSize: 11 }}>在籍</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <Link href={`/admin/staff/${s.id}`} style={{ fontSize: 12, color: "#8c1f1f", textDecoration: "none" }}>詳細</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
