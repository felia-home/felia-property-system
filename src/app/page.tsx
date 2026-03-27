"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Property = {
  id: string;
  property_type: string;
  status: string;
  city: string;
  station_name: string;
  station_walk: number;
  price: number;
  rooms: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:         { label: "下書き",     color: "#706e68", bg: "#f2f1ed" },
  REVIEW:        { label: "確認中",     color: "#8a5200", bg: "#fff3d6" },
  PENDING:       { label: "承認待ち",   color: "#8a5200", bg: "#fff3d6" },
  APPROVED:      { label: "承認済み",   color: "#234f35", bg: "#e6f0e9" },
  PUBLISHED_HP:  { label: "HP掲載中",  color: "#1a3f6e", bg: "#e6effa" },
  PUBLISHED_ALL: { label: "全掲載中",  color: "#1a3f6e", bg: "#e6effa" },
  SUSPENDED:     { label: "停止中",    color: "#706e68", bg: "#f2f1ed" },
  SOLD:          { label: "成約済み",  color: "#8c1f1f", bg: "#fdeaea" },
};

const TYPE_LABEL: Record<string, string> = {
  NEW_HOUSE:   "新築戸建",
  USED_HOUSE:  "中古戸建",
  MANSION:     "マンション",
  NEW_MANSION: "新築マンション",
  LAND:        "土地",
  OTHER:       "その他",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const fetchProperties = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/properties?${params.toString()}`);
    const data = await res.json();
    setProperties(data.properties ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件一覧</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
            {loading ? "読み込み中..." : `${total}件の物件`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/properties/new" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#234f35", color: "#fff", textDecoration: "none",
          }}>+ 新規登録</Link>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="住所・駅名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProperties()}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }}
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); }}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}
          >
            <option value="">全ステータス</option>
            <option value="DRAFT">下書き</option>
            <option value="PENDING">承認待ち</option>
            <option value="PUBLISHED_HP">HP掲載中</option>
            <option value="SOLD">成約済み</option>
          </select>
          <button
            onClick={fetchProperties}
            style={{ padding: "6px 14px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, background: "#f7f6f2", cursor: "pointer", fontFamily: "inherit" }}
          >検索</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["物件", "種別", "ステータス", "価格", "登録日", "操作"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68" }}>読み込み中...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>
                物件がありません。新規登録から追加してください。
              </td></tr>
            ) : properties.map((p) => {
              const st = STATUS_LABEL[p.status] ?? { label: p.status, color: "#706e68", bg: "#f2f1ed" };
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #e0deda" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.city} {p.station_name}駅 徒歩{p.station_walk}分</div>
                    <div style={{ fontSize: 11, color: "#706e68", marginTop: 2 }}>{p.rooms ?? ""}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12 }}>{TYPE_LABEL[p.property_type] ?? p.property_type}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{st.label}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{p.price.toLocaleString()}万円</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "#706e68" }}>{new Date(p.created_at).toLocaleDateString("ja-JP")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/admin/properties/${p.id}`} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #e0deda", borderRadius: 6, textDecoration: "none", color: "#1c1b18" }}>詳細</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}