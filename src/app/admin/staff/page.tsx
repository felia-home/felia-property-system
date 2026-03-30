"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PermissionBadge from "@/components/admin/PermissionBadge";
import { PERMISSIONS, Permission } from "@/lib/permissions";

interface StaffMember {
  id: string;
  name: string;
  name_kana: string | null;
  employee_number: string | null;
  permission: string;
  position: string | null;
  qualifications: string[];
  photo_url: string | null;
  email_work: string | null;
  tel_work: string | null;
  is_active: boolean;
  store: { id: string; name: string; store_code: string } | null;
  _count?: { properties_as_agent: number };
}

const PERMISSION_KEYS = ["ADMIN", "MANAGER", "SENIOR", "AGENT", "OFFICE"] as const;

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [permFilter, setPermFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"active" | "retired">("active");
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (permFilter !== "all") params.set("permission", permFilter);
      if (storeFilter) params.set("store_id", storeFilter);
      params.set("active", activeFilter === "active" ? "true" : "false");
      params.set("includeStats", "true");
      if (search) params.set("search", search);
      const res = await fetch(`/api/staff?${params}`);
      const data = await res.json() as { staff?: StaffMember[] };
      setStaff(data.staff ?? []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then((d: { stores: { id: string; name: string }[] }) => setStores(d.stores ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [permFilter, storeFilter, activeFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabBtnSt = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? "#234f35" : "#f7f6f2",
    color: active ? "#fff" : "#706e68",
    border: "none", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1c1b18" }}>スタッフ管理</h1>
        <Link href="/admin/staff/new" style={{
          background: "#8c1f1f", color: "#fff", padding: "8px 20px",
          borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600,
        }}>
          + スタッフ追加
        </Link>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "16px 20px", marginBottom: 20 }}>
        {/* Permission tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button style={tabBtnSt(permFilter === "all")} onClick={() => setPermFilter("all")}>全員</button>
          {PERMISSION_KEYS.map(p => (
            <button key={p} style={tabBtnSt(permFilter === p)} onClick={() => setPermFilter(p)}>
              {PERMISSIONS[p].label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Store filter */}
          <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
            style={{ padding: "7px 11px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
            <option value="">全店舗</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Active/Retired toggle */}
          <div style={{ display: "flex", gap: 0, border: "1px solid #e0deda", borderRadius: 7, overflow: "hidden" }}>
            {(["active", "retired"] as const).map(v => (
              <button key={v} onClick={() => setActiveFilter(v)}
                style={{ padding: "7px 14px", fontSize: 12, border: "none", background: activeFilter === v ? "#234f35" : "#fff", color: activeFilter === v ? "#fff" : "#706e68", cursor: "pointer", fontFamily: "inherit" }}>
                {v === "active" ? "在籍中" : "退職済み"}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・社員番号で検索..."
            style={{ padding: "7px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", width: 220 }}
          />

          <span style={{ fontSize: 12, color: "#888", marginLeft: "auto" }}>{staff.length}名</span>
        </div>
      </div>

      {/* Staff grid */}
      {loading ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 48 }}>読み込み中...</div>
      ) : staff.length === 0 ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 48 }}>スタッフが見つかりません</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {staff.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Photo */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f7f6f2", overflow: "hidden", marginBottom: 4, flexShrink: 0 }}>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc" }}>👤</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1b18" }}>{s.name}</div>
                {s.name_kana && <div style={{ fontSize: 11, color: "#888" }}>{s.name_kana}</div>}
              </div>

              <div style={{ fontSize: 12, color: "#706e68" }}>{s.store?.name ?? "—"}</div>

              {s.position && <div style={{ fontSize: 12, color: "#706e68" }}>{s.position}</div>}

              <PermissionBadge permission={s.permission} />

              {(s.qualifications ?? []).length > 0 && (
                <div style={{ fontSize: 11, color: "#706e68" }}>{(s.qualifications ?? []).slice(0, 2).join("・")}{(s.qualifications ?? []).length > 2 ? `他${(s.qualifications ?? []).length - 2}件` : ""}</div>
              )}

              {s._count && (
                <div style={{ fontSize: 12, color: "#888" }}>担当物件: <strong style={{ color: "#1c1b18" }}>{s._count.properties_as_agent}</strong>件</div>
              )}

              <Link href={`/admin/staff/${s.id}`}
                style={{ marginTop: "auto", fontSize: 12, color: "#8c1f1f", textDecoration: "none", fontWeight: 600, paddingTop: 8, borderTop: "1px solid #f2f1ed" }}>
                詳細を見る →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
