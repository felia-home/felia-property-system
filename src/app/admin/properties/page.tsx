"use client";
import { useEffect, useState, useCallback } from "react";
import { PROPERTY_STATUS, getStatusDef } from "@/lib/workflow-status";
import { calcPropertyCompletion } from "@/lib/property-completion";

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
  area_land_m2: number | null;
  area_build_m2: number | null;
  area_exclusive_m2: number | null;
  property_number: string | null;
  photo_count: number;
  photo_has_exterior: boolean;
  photo_has_floor_plan: boolean;
  ad_confirmed_at: string | null;
  title: string | null;
  catch_copy: string | null;
  description_hp: string | null;
  use_zone: string | null;
  pending_tasks: string[];
  published_at: string | null;
  created_at: string;
  // 掲載フラグ
  published_hp: boolean;
  published_members: boolean;
  published_suumo: boolean;
  published_athome: boolean;
  published_yahoo: boolean;
  published_homes: boolean;
  // 物件確認
  last_checked_at: string | null;
  check_interval_days: number;
  images: Array<{ id: string; url: string; is_main: boolean }>;
  _count: { images: number };
  agent?: { id: string; name: string; photo_url: string | null } | null;
  view_count_7d?:    number;
  view_count_total?: number;
}

type ViewSort = "none" | "total_desc" | "week_desc";

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// 住所内の日付化された番地を逆変換して表示する
// 例: "7月24日" → "7-24", "Jun-08" → "6-8"
const ADDRESS_MONTH_MAP: Record<string, string> = {
  Jan: "1", Feb: "2", Mar: "3", Apr: "4", May: "5", Jun: "6",
  Jul: "7", Aug: "8", Sep: "9", Oct: "10", Nov: "11", Dec: "12",
};
function fixAddressForDisplay(s: string | null | undefined): string {
  if (!s) return "";
  let out = s;
  // 7月24日 → 7-24
  out = out.replace(/(\d{1,2})月(\d{1,2})日/g, (_m, a, b) => `${parseInt(a)}-${parseInt(b)}`);
  // Jun-08 → 6-8
  out = out.replace(/\b([A-Za-z]{3})-(\d{1,2})\b/g, (_m, mon: string, d: string) => {
    const key = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
    const num = ADDRESS_MONTH_MAP[key];
    return num ? `${num}-${parseInt(d)}` : `${mon}-${d}`;
  });
  return out;
}

function buildAddressLabel(p: { city?: string | null; town?: string | null; address?: string | null }): string {
  return [p.city, p.town, fixAddressForDisplay(p.address)].filter(Boolean).join("");
}

function completionColor(score: number): string {
  if (score >= 80) return "#1b5e20";
  if (score >= 50) return "#f57c00";
  return "#8c1f1f";
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [alertOnly, setAlertOnly] = useState(false);
  const [noCopyOnly, setNoCopyOnly] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkErrors, setBulkErrors] = useState(0);
  const [viewSort, setViewSort] = useState<ViewSort>("none");

  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then(d => setStores(d.stores ?? [])).catch(() => {});
    // Fetch all properties for status count badges (no status filter)
    fetch("/api/properties?limit=1000")
      .then(r => r.json())
      .then((d: { properties?: Property[] }) => {
        const counts: Record<string, number> = {};
        for (const p of d.properties ?? []) {
          counts[p.status] = (counts[p.status] ?? 0) + 1;
        }
        setStatusCounts(counts);
      })
      .catch(() => {});
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
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      let props: Property[] = data.properties ?? [];
      if (alertOnly) props = props.filter(p => (p.pending_tasks?.length ?? 0) > 0);
      setProperties(props);
      setTotal(alertOnly ? props.length : (data.total ?? 0));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, status, storeFilter, agentFilter, alertOnly, noCopyOnly, page, pageSize]);

  // フィルタ変更時はページを1にリセット
  useEffect(() => { setPage(1); }, [search, status, storeFilter, agentFilter, alertOnly, noCopyOnly]);

  const handleBulkGenerate = async () => {
    // 広告文未入力の物件を取得（現在表示中のリストから or APIから）
    const res = await fetch("/api/properties?noCopy=true");
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      alert(`サーバーエラー（${res.status}）`);
      return;
    }
    const data = await res.json();
    const targets: Property[] = data.properties ?? [];

    if (targets.length === 0) {
      setBulkMsg("広告文未入力の物件はありません");
      return;
    }

    if (!confirm(`${targets.length}件の物件に広告文をAI生成します。\n処理時間の目安: 約${targets.length * 10}秒\nよろしいですか？`)) return;

    setBulkGenerating(true);
    setBulkTotal(targets.length);
    setBulkProgress(0);
    setBulkErrors(0);
    setBulkMsg(null);

    let errorCount = 0;

    for (let i = 0; i < targets.length; i++) {
      try {
        const genRes = await fetch(`/api/properties/${targets[i].id}/generate-content`, { method: "POST" });
        if (!genRes.ok) errorCount++;
      } catch {
        errorCount++;
      }
      setBulkProgress(i + 1);
      setBulkErrors(errorCount);

      // 2秒待機（Anthropic APIのレート制限対策）
      if (i < targets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setBulkGenerating(false);
    setBulkMsg(`✅ 完了: ${targets.length - errorCount}件生成、${errorCount}件失敗`);
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
          <button
            onClick={bulkGenerating ? undefined : handleBulkGenerate}
            disabled={bulkGenerating}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: bulkGenerating ? "#555" : "#6a1b9a", color: "#fff", border: "none", cursor: bulkGenerating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {bulkGenerating ? `✨ 生成中 ${bulkProgress}/${bulkTotal}件...` : "✨ 広告文未入力を一括AI生成"}
          </button>
          <a href="/admin/import" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>📥 CSVインポート</a>
          <a href="/admin/properties/import?tab=scrape" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>🔗 URLから取込</a>
          <a href="/admin/properties/import" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", textDecoration: "none" }}>📄 PDF取込</a>
          <a href="/admin/properties/new" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", textDecoration: "none" }}>+ 新規登録</a>
        </div>
      </div>

      {/* Status tab bar */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden", marginBottom: 0 }}>
        <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid #e0deda", padding: "0 16px" }}>
          {[{ value: "", label: "すべて" }, ...STATUS_OPTIONS].map(o => {
            const count = o.value === "" ? Object.values(statusCounts).reduce((a, b) => a + b, 0) : (statusCounts[o.value] ?? 0);
            const active = status === o.value;
            const def = o.value ? PROPERTY_STATUS[o.value as keyof typeof PROPERTY_STATUS] : null;
            return (
              <button
                key={o.value}
                onClick={() => setStatus(o.value)}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: `2px solid ${active ? (def?.color ?? "#234f35") : "transparent"}`,
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? (def?.color ?? "#234f35") : "#706e68",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "color .15s",
                }}
              >
                {def?.icon} {o.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10,
                    background: active ? (def?.color ?? "#234f35") : "#e8e4e0",
                    color: active ? "#fff" : "#706e68",
                    borderRadius: 99,
                    padding: "1px 6px",
                    fontWeight: 700,
                    minWidth: 18,
                    textAlign: "center",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="住所・駅名で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 200, fontFamily: "inherit" }}
          />
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
              {["", "物件情報", "掲載", "ステータス", "写真", "広告文", "完成度", "価格", "掲載日数"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid #e0deda", whiteSpace: "nowrap" }}>{h}</th>
              ))}
              <th
                onClick={() => setViewSort(s =>
                  s === "none" ? "total_desc" :
                  s === "total_desc" ? "week_desc" :
                  "none"
                )}
                style={{
                  textAlign: "left", fontSize: 10, fontWeight: 500,
                  color: viewSort === "none" ? "#706e68" : "#234f35",
                  letterSpacing: ".07em", textTransform: "uppercase",
                  padding: "10px 14px", borderBottom: "1px solid #e0deda",
                  whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                }}
                title="クリックでソート切替: 累計降順 → 7日降順 → 解除"
              >
                閲覧数{viewSort === "total_desc" ? " ↓累計" : viewSort === "week_desc" ? " ↓7日" : ""}
              </th>
              <th style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid #e0deda", whiteSpace: "nowrap" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>物件データがありません。</td></tr>
            ) : (
              [...properties].sort((a, b) => {
                if (viewSort === "total_desc") return (b.view_count_total ?? 0) - (a.view_count_total ?? 0);
                if (viewSort === "week_desc")  return (b.view_count_7d ?? 0)    - (a.view_count_7d ?? 0);
                return 0;
              }).map(p => {
                const def = getStatusDef(p.status);
                const mainImg = p.images?.[0];
                // _count.images を優先（インポート直後の photo_count キャッシュ更新漏れ対策）
                const photoCount = p._count?.images ?? p.photo_count ?? 0;
                const adOk = !!p.ad_confirmed_at;
                const completion = calcPropertyCompletion({
                  city: p.city,
                  station_name1: p.station_name1,
                  price: p.price,
                  area_land_m2: p.area_land_m2,
                  area_build_m2: p.area_build_m2,
                  area_exclusive_m2: p.area_exclusive_m2,
                  photo_count: photoCount,
                  photo_has_exterior: p.photo_has_exterior,
                  photo_has_floor_plan: p.photo_has_floor_plan,
                  title: p.title,
                  catch_copy: p.catch_copy,
                  description_hp: p.description_hp,
                  use_zone: p.use_zone,
                });
                const completionPct = completion.score;
                const cc = completionColor(completionPct);
                const daysListed = p.published_at ? daysAgo(p.published_at) : null;

                // 確認期限アラート
                const checkDeadlineAlert = (() => {
                  if (!p.last_checked_at) return "none"; // 未確認
                  const daysSinceCheck = daysAgo(p.last_checked_at);
                  const interval = p.check_interval_days ?? 14;
                  if (daysSinceCheck >= interval) return "over";
                  if (daysSinceCheck >= interval - 3) return "soon";
                  return "ok";
                })();

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
                        {TYPE_LABELS[p.property_type] ?? p.property_type}｜{buildAddressLabel(p)}
                      </div>
                      <div style={{ fontSize: 11, color: "#706e68", marginTop: 3 }}>
                        {p.station_name1 ? `${p.station_name1} 徒歩${p.station_walk1}分` : ""}
                        {p.rooms ? `｜${p.rooms}` : ""}
                        {p.area_build_m2 ? `｜${p.area_build_m2}㎡` : ""}
                      </div>
                      {p.property_number && (
                        <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{p.property_number}</div>
                      )}
                      {/* 担当者 */}
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        {p.agent ? (
                          <>
                            {p.agent.photo_url && (
                              <img
                                src={p.agent.photo_url}
                                alt=""
                                style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
                              />
                            )}
                            <span>👤 {p.agent.name}</span>
                          </>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>担当者未設定</span>
                        )}
                      </div>
                      {/* 確認期限バッジ */}
                      {checkDeadlineAlert === "over" && (
                        <span title={`確認期限超過（${p.check_interval_days}日ごと）`} style={{ display: "inline-block", marginTop: 3, fontSize: 10, background: "#fdeaea", color: "#8c1f1f", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>
                          ⚠ 確認期限超過
                        </span>
                      )}
                      {checkDeadlineAlert === "soon" && (
                        <span title={`確認期限まで残り3日以内`} style={{ display: "inline-block", marginTop: 3, fontSize: 10, background: "#fff3e0", color: "#e65100", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>
                          ⏰ 期限まもなく
                        </span>
                      )}
                      {checkDeadlineAlert === "none" && (p.published_hp || p.published_suumo || p.published_athome || p.published_yahoo || p.published_homes) && (
                        <span title="まだ確認が記録されていません" style={{ display: "inline-block", marginTop: 3, fontSize: 10, background: "#fff3e0", color: "#e65100", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>
                          📋 未確認
                        </span>
                      )}
                    </td>

                    {/* 掲載バッジ */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 100 }}>
                        {p.published_hp && <span style={{ fontSize: 9, background: "#e8f5e9", color: "#1b5e20", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>HP</span>}
                        {p.published_members && <span style={{ fontSize: 9, background: "#e3f2fd", color: "#0d47a1", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>会員</span>}
                        {p.published_suumo && <span style={{ fontSize: 9, background: "#f3e5f5", color: "#6a1b9a", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>SUUMO</span>}
                        {p.published_athome && <span style={{ fontSize: 9, background: "#fce4ec", color: "#880e4f", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>athome</span>}
                        {p.published_yahoo && <span style={{ fontSize: 9, background: "#fff3e0", color: "#e65100", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>Yahoo</span>}
                        {p.published_homes && <span style={{ fontSize: 9, background: "#e0f2f1", color: "#004d40", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>HOMES</span>}
                        {!p.published_hp && !p.published_members && !p.published_suumo && !p.published_athome && !p.published_yahoo && !p.published_homes && (
                          <span style={{ fontSize: 9, color: "#aaa" }}>—</span>
                        )}
                      </div>
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

                    {/* View counts */}
                    <td style={{ padding: "12px 14px", fontSize: 11, color: "#374151", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: viewSort === "total_desc" ? 700 : 500 }}>
                        累計: {(p.view_count_total ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, fontWeight: viewSort === "week_desc" ? 700 : 400 }}>
                        7日: {(p.view_count_7d ?? 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "12px 14px" }}>
                      <a href={`/admin/properties/${p.id}`}
                        style={{ fontSize: 12, color: completion.required.length > 0 ? "#8c1f1f" : "#234f35", textDecoration: "none", fontWeight: 600 }}>
                        {completion.required.length > 0 ? "対応" : "詳細"}
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {!loading && total > 0 && (() => {
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, marginTop: 16, fontSize: 13, color: "#374151",
          }}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: "6px 14px", borderRadius: 6,
                border: "1px solid #d1d5db", background: "#fff",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                color: page <= 1 ? "#9ca3af" : "#374151",
                fontFamily: "inherit",
              }}
            >
              ← 前
            </button>
            <span style={{ padding: "6px 12px" }}>
              {page} / {totalPages}ページ（{total.toLocaleString()}件）
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: "6px 14px", borderRadius: 6,
                border: "1px solid #d1d5db", background: "#fff",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                color: page >= totalPages ? "#9ca3af" : "#374151",
                fontFamily: "inherit",
              }}
            >
              次 →
            </button>
          </div>
        );
      })()}

      {/* 進捗トースト */}
      {bulkGenerating && (
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          background: "#fff", border: "1px solid #e0deda",
          borderRadius: 12, padding: "16px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 100, minWidth: 280,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>✨ AI広告文生成中...</div>
          <div style={{ background: "#e0deda", borderRadius: 4, height: 8, marginBottom: 8 }}>
            <div style={{
              background: "#6a1b9a", borderRadius: 4, height: 8,
              width: `${bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0}%`,
              transition: "width 0.3s ease",
            }} />
          </div>
          <div style={{ fontSize: 13, color: "#706e68" }}>
            {bulkProgress} / {bulkTotal} 件完了
            {bulkErrors > 0 && ` （エラー: ${bulkErrors}件）`}
          </div>
        </div>
      )}
    </div>
  );
}
