"use client";
import { useState, useEffect, useCallback } from "react";

interface ReinsProperty {
  id: string;
  source_type: string;
  property_type: string | null;
  price: number | null;
  address: string | null;
  area: string | null;
  town: string | null;
  area_m2: number | null;
  area_build_m2: number | null;
  area_land_m2: number | null;
  rooms: string | null;
  building_name: string | null;
  station_line: string | null;
  station_name: string | null;
  walk_minutes: number | null;
  built_year_text: string | null;
  management_fee: number | null;
  transaction_type: string | null;
  is_active: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  MANSION: "マンション",
  HOUSE: "戸建て",
  LAND: "土地",
};

const SOURCE_COLORS: Record<string, string> = {
  MANSION: "#eff6ff",
  HOUSE: "#f0fdf4",
  LAND: "#fefce8",
};

export default function ReinsPage() {
  const [properties, setProperties] = useState<ReinsProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (sourceType) params.set("source_type", sourceType);
      if (priceMin) params.set("price_min", priceMin);
      if (priceMax) params.set("price_max", priceMax);
      params.set("page", String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/reins?${params}`);
      const data = await res.json();
      setProperties(data.properties ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [q, sourceType, priceMin, priceMax, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>レインズ物件</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            会員限定公開のレインズデータ。全{total.toLocaleString()}件
          </p>
        </div>
      </div>

      {/* 検索フィルタ */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        marginBottom: 16, padding: 16,
        background: "#f9fafb", borderRadius: 8,
        border: "1px solid #e5e7eb",
      }}>
        <input
          type="text"
          placeholder="住所・建物名・駅名で検索"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 220 }}
        />
        <select
          value={sourceType}
          onChange={e => { setSourceType(e.target.value); setPage(1); }}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
        >
          <option value="">全種別</option>
          <option value="MANSION">マンション</option>
          <option value="HOUSE">戸建て</option>
          <option value="LAND">土地</option>
        </select>
        <input
          type="number"
          placeholder="価格下限（万円）"
          value={priceMin}
          onChange={e => { setPriceMin(e.target.value); setPage(1); }}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 130 }}
        />
        <span style={{ alignSelf: "center", color: "#6b7280" }}>〜</span>
        <input
          type="number"
          placeholder="価格上限（万円）"
          value={priceMax}
          onChange={e => { setPriceMax(e.target.value); setPage(1); }}
          style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 130 }}
        />
        <button
          onClick={() => { setQ(""); setSourceType(""); setPriceMin(""); setPriceMax(""); setPage(1); }}
          style={{ padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#fff", cursor: "pointer" }}
        >
          リセット
        </button>
      </div>

      {/* 物件一覧テーブル */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>種別</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>所在地</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>建物名</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280", fontWeight: "bold" }}>価格</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>間取り・面積</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>最寄り駅</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>築年</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "#6b7280", fontWeight: "bold" }}>取引</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>読み込み中...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>該当する物件がありません</td></tr>
            ) : properties.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: "bold",
                    background: SOURCE_COLORS[p.source_type] ?? "#f3f4f6",
                    color: "#374151",
                  }}>
                    {SOURCE_LABELS[p.source_type] ?? p.source_type}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>
                  {p.address}
                </td>
                <td style={{ padding: "8px 12px", color: "#374151", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.building_name ?? "—"}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold", color: "#e53935" }}>
                  {p.price ? `${p.price.toLocaleString()}万円` : "—"}
                </td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>
                  {p.rooms && <span>{p.rooms}</span>}
                  {p.area_m2 && <span style={{ color: "#6b7280", marginLeft: 4 }}>{p.area_m2}㎡</span>}
                  {p.area_build_m2 && <span style={{ color: "#6b7280", marginLeft: 4 }}>{p.area_build_m2}㎡</span>}
                  {p.area_land_m2 && <span style={{ color: "#6b7280", marginLeft: 4 }}>{p.area_land_m2}㎡</span>}
                </td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>
                  {p.station_line && p.station_name
                    ? `${p.station_line} ${p.station_name}駅 ${p.walk_minutes ? `徒歩${p.walk_minutes}分` : ""}`
                    : "—"}
                </td>
                <td style={{ padding: "8px 12px", color: "#374151" }}>
                  {p.built_year_text ?? "—"}
                </td>
                <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 11 }}>
                  {p.transaction_type ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#9ca3af" : "#374151" }}
          >
            ← 前
          </button>
          <span style={{ padding: "6px 14px", fontSize: 13, color: "#6b7280" }}>
            {page} / {totalPages}ページ（{total.toLocaleString()}件）
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#9ca3af" : "#374151" }}
          >
            次 →
          </button>
        </div>
      )}
    </div>
  );
}
