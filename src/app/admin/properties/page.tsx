"use client";
import { useEffect, useState, useCallback } from "react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  REVIEW: "AI確認中",
  PENDING: "承認待ち",
  APPROVED: "承認済み",
  PUBLISHED_HP: "HP掲載中",
  PUBLISHED_ALL: "全媒体掲載",
  SUSPENDED: "一時停止",
  SOLD: "成約済み",
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT:        { bg: "#f3f2ef", color: "#706e68" },
  REVIEW:       { bg: "#fff7cc", color: "#7a5c00" },
  PENDING:      { bg: "#fff0e5", color: "#c05600" },
  APPROVED:     { bg: "#e6f4ea", color: "#1a7737" },
  PUBLISHED_HP: { bg: "#e3f0ff", color: "#1a56a0" },
  PUBLISHED_ALL:{ bg: "#234f35", color: "#fff" },
  SUSPENDED:    { bg: "#f3f2ef", color: "#706e68" },
  SOLD:         { bg: "#fdeaea", color: "#8c1f1f" },
};

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE:    "新築戸建",
  USED_HOUSE:   "中古戸建",
  MANSION:      "マンション",
  NEW_MANSION:  "新築マンション",
  LAND:         "土地",
};

interface Property {
  id: string;
  property_type: string;
  status: string;
  city: string;
  address: string;
  station_name: string;
  station_walk: number;
  price: number;
  rooms: string | null;
  area_build_m2: number | null;
  agent_id: string | null;
  created_at: string;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // ネットワークエラーは無視
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const badge = (s: string) => STATUS_BADGE[s] ?? { bg: "#f3f2ef", color: "#706e68" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件一覧</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>登録物件の管理・掲載設定</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/properties/import" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none",
          }}>PDF取込</a>
          <a href="/admin/properties/new" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#234f35", color: "#fff", textDecoration: "none",
          }}>+ 新規登録</a>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="住所・駅名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}
          >
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {!loading && (
            <span style={{ fontSize: 12, color: "#706e68", marginLeft: "auto" }}>{total}件</span>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["物件情報", "担当者", "ステータス", "価格", "掲載日数", "操作"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 500,
                  color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase",
                  padding: "10px 16px", borderBottom: "1px solid #e0deda",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>
                  読み込み中...
                </td>
              </tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>
                  物件データがありません。PDF取込または新規登録から追加してください。
                </td>
              </tr>
            ) : (
              properties.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.address}
                    </div>
                    <div style={{ fontSize: 11, color: "#706e68", marginTop: 3 }}>
                      {p.station_name} 徒歩{p.station_walk}分
                      {p.rooms ? `｜${p.rooms}` : ""}
                      {p.area_build_m2 ? `｜${p.area_build_m2}㎡` : ""}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#706e68" }}>
                    {p.agent_id ?? "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      ...badge(p.status),
                      padding: "3px 10px", borderRadius: 99,
                      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
                    }}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {p.price.toLocaleString()}万円
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#706e68" }}>
                    {daysAgo(p.created_at)}日
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <a href={`/admin/properties/${p.id}`} style={{ fontSize: 12, color: "#234f35", textDecoration: "none", fontWeight: 500 }}>
                      詳細
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
