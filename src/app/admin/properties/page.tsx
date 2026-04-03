"use client";
import { useEffect, useState, useCallback } from "react";
import { PROPERTY_STATUS, getStatusDef } from "@/lib/workflow-status";

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

// Build status options from workflow definition
const STATUS_OPTIONS = Object.entries(PROPERTY_STATUS).map(([k, v]) => ({ value: k, label: v.label }));

interface Store { id: string; name: string }
interface Staff { id: string; full_name: string }

interface Property {
  id: string;
  property_type: string;
  status: string;
  city: string;
  town: string | null;
  address: string;
  station_name1: string | null;
  station_walk1: number | null;
  price: number;
  rooms: string | null;
  area_build_m2: number | null;
  property_number: string | null;
  photo_count: number;
  photo_has_exterior: boolean;
  photo_has_floor_plan: boolean;
  ad_confirmed_at: string | null;
  catch_copy: string | null;
  pending_tasks: string[];
  published_at: string | null;
  created_at: string;
  images: Array<{ id: string; url: string; is_main: boolean }>;
  _count: { images: number };
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function completionColor(photoCount: number, adOk: boolean, pendingCount: number): string {
  if (pendingCount === 0) return "#1b5e20";
  if (pendingCount <= 2 && adOk) return "#f57c00";
  return "#8c1f1f";
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [alertOnly, setAlertOnly] = useState(false);
  const [noCopyOnly, setNoCopyOnly] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then(d => setStores(d.stores ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!storeFilter) { setStaffList([]); setAgentFilter(""); return; }
    fetch(`/api/staff?store_id=${storeFilter}`).then(r => r.json()).then(d => setStaffList(d.staff ?? [])).catch(() => {});
  }, [storeFilter]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (storeFilter) params.set("store_id", storeFilter);
      if (agentFilter) params.set("agent_id", agentFilter);
      if (noCopyOnly) params.set("noCopy", "true");
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      let props: Property[] = data.properties ?? [];
      if (alertOnly) props = props.filter(p => (p.pending_tasks?.length ?? 0) > 0);
      setProperties(props);
      setTotal(alertOnly ? props.length : (data.total ?? 0));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, status, storeFilter, agentFilter, alertOnly, noCopyOnly]);

  const handleBulkGenerate = async () => {
    const targets = properties.filter(p => !p.catch_copy);
    if (targets.length === 0) { setBulkMsg("広告文未生成の物件はありません"); return; }
    if (!confirm(`広告文が未生成の${targets.length}件を一括生成します。時間がかかる場合があります。よろしいですか？`)) return;
    setBulkGenerating(true);
    setBulkMsg(null);
    let ok = 0, fail = 0;
    for (const p of targets) {
      try {
        const res = await fetch(`/api/properties/${p.id}/generate-content`, { method: "POST" });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkGenerating(false);
    setBulkMsg(`完了: ${ok}件生成、${fail}件失敗`);
    fetchProperties();
  };

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件一覧</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>登録物件の管理・掲載設定</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleBulkGenerate} disabled={bulkGenerating}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: bulkGenerating ? "#888" : "#fff", border: "1px solid #e0deda", color: bulkGenerating ? "#fff" : "#1c1b18", cursor: "pointer", fontFamily: "inherit" }}>
            {bulkGenerating ? "🤖 生成中..." : "🤖 広告文一括生成"}
          </button>
          <a href="/admin/import" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>📥 CSVインポート</a>
          <a href="/admin/properties/import?tab=scrape" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>🔗 URLから取込</a>
          <a href="/admin/properties/import" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>📄 PDF取込</a>
          <a href="/admin/properties/new" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", textDecoration: "none" }}>+ 新規登録</a>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="住所・駅名で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }}
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}
          >
            <option value="">全ステータス</option>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {stores.length > 0 && (
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
              <option value="">全店舗</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {storeFilter && staffList.length > 0 && (
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
              <option value="">全担当者</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: alertOnly ? "#8c1f1f" : "#706e68", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)}
              style={{ cursor: "pointer" }} />
            要対応のみ
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: noCopyOnly ? "#7b1fa2" : "#706e68", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={noCopyOnly} onChange={e => setNoCopyOnly(e.target.checked)}
              style={{ cursor: "pointer" }} />
            広告文なし
          </label>
          {bulkMsg && <span style={{ fontSize: 11, color: "#706e68" }}>{bulkMsg}</span>}
          {!loading && (
            <span style={{ fontSize: 12, color: "#706e68", marginLeft: "auto" }}>{total}件</span>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["", "物件情報", "ステータス", "写真", "広告文", "完成度", "価格", "掲載日数", ""].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid #e0deda", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>物件データがありません。</td></tr>
            ) : (
              properties.map(p => {
                const def = getStatusDef(p.status);
                const mainImg = p.images?.[0];
                const photoCount = p.photo_count ?? p._count?.images ?? 0;
                const adOk = !!p.ad_confirmed_at;
                const pendingCount = p.pending_tasks?.length ?? 0;
                const cc = completionColor(photoCount, adOk, pendingCount);
                // Rough completion %
                const completionPct = Math.max(0, 100 - pendingCount * 10);
                const daysListed = p.published_at ? daysAgo(p.published_at) : null;

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                    {/* Thumbnail */}
                    <td style={{ padding: "10px 12px 10px 14px", width: 72 }}>
                      {mainImg ? (
                        <img src={mainImg.url} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 64, height: 48, borderRadius: 6, background: "#f3f2ef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#d0cec8" }}>🏠</div>
                      )}
                    </td>

                    {/* Property info */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.town ?? ""}{p.address}
                      </div>
                      <div style={{ fontSize: 11, color: "#706e68", marginTop: 3 }}>
                        {p.station_name1 ? `${p.station_name1} 徒歩${p.station_walk1}分` : ""}
                        {p.rooms ? `｜${p.rooms}` : ""}
                        {p.area_build_m2 ? `｜${p.area_build_m2}㎡` : ""}
                      </div>
                      {p.property_number && (
                        <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{p.property_number}</div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ background: def.bg, color: def.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                        {def.icon} {def.label}
                      </span>
                    </td>

                    {/* Photos */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      {photoCount === 0 ? (
                        <span title="写真が登録されていません。写真管理から追加してください" style={{ background: "#fdeaea", color: "#8c1f1f", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10 }}>📷なし</span>
                      ) : (
                        <span style={{ fontSize: 12, color: photoCount < 5 ? "#e65100" : "#706e68" }}>
                          📷{photoCount}枚{photoCount < 5 ? <span title="掲載には5枚以上の写真が推奨されます"> △</span> : ""}
                          {adOk && <span style={{ marginLeft: 4, fontSize: 10, color: "#234f35" }}>✅広告OK</span>}
                        </span>
                      )}
                    </td>

                    {/* Copy status */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      {p.catch_copy ? (
                        <span title={p.catch_copy} style={{ fontSize: 10, background: "#e8f5e9", color: "#1b5e20", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>✅ 生成済</span>
                      ) : (
                        <span style={{ fontSize: 10, background: "#f3f2ef", color: "#9e9e9e", padding: "2px 7px", borderRadius: 10 }}>未生成</span>
                      )}
                    </td>

                    {/* Completion */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 50, height: 5, background: "#f2f1ed", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${completionPct}%`, background: cc, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: cc, fontWeight: 600 }}>{completionPct}%</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {p.price.toLocaleString()}万円
                    </td>

                    {/* Days on market */}
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#706e68", whiteSpace: "nowrap" }}>
                      {daysListed !== null ? `${daysListed}日` : "—"}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "12px 14px" }}>
                      <a href={`/admin/properties/${p.id}`}
                        style={{ fontSize: 12, color: pendingCount > 0 ? "#8c1f1f" : "#234f35", textDecoration: "none", fontWeight: 600 }}>
                        {pendingCount > 0 ? "対応" : "詳細"}
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
