"use client";
import { useEffect, useState } from "react";
import { HATSUPO_SITES } from "@/lib/scraper-registry";

interface CompetitorListing {
  id: string;
  source: string;
  source_id: string;
  property_type: string | null;
  address_city: string | null;
  station_name: string | null;
  station_walk: number | null;
  price: number | null;
  area_m2: number | null;
  rooms: string | null;
  first_seen_at: string;
  last_seen_at: string;
  sold_detected_at: string | null;
  price_history: Array<{ price: number; date: string }> | null;
}

interface SyncSummary { site: string; scraped: number; new: number; sold: number; errors: number }

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

export default function CompetitorPage() {
  const [listings, setListings] = useState<CompetitorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncSummary[] | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [filterSold, setFilterSold] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitor/listings");
      if (res.ok) {
        const d = await res.json() as { listings: CompetitorListing[] };
        setListings(d.listings ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    if (!selectedSites.length) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/competitor/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: selectedSites }),
      });
      const d = await res.json() as { summary: SyncSummary[] };
      setSyncResult(d.summary ?? []);
      await load();
    } catch { /* ignore */ }
    setSyncing(false);
  };

  const displayListings = filterSold
    ? listings.filter(l => l.sold_detected_at)
    : listings.filter(l => !l.sold_detected_at);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a" }}>競合物件モニタリング</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>他社物件データの収集・価格変動検知（内部管理用途のみ）</p>
        </div>
      </div>

      {/* Sync panel */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#3a2a1a", marginBottom: 14 }}>同期対象サイトを選択</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {HATSUPO_SITES.filter(s => !s.domain.includes("felia")).map(site => (
            <label key={site.domain} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selectedSites.includes(`https://${site.domain}/sch/sch_list.php`)}
                onChange={e => {
                  const url = `https://${site.domain}/sch/sch_list.php`;
                  setSelectedSites(ss => e.target.checked ? [...ss, url] : ss.filter(s => s !== url));
                }}
              />
              {site.name}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="text"
              placeholder="カスタムURL: https://example.co.jp/sch/sch_list.php"
              style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "5px 10px", fontSize: 12, width: 340, fontFamily: "inherit" }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val.startsWith("http") && !selectedSites.includes(val)) {
                    setSelectedSites(ss => [...ss, val]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </label>
        </div>

        {selectedSites.length > 0 && (
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
            選択中: {selectedSites.map(s => s.replace("https://", "").split("/")[0]).join(", ")}
          </div>
        )}

        <button onClick={handleSync} disabled={syncing || !selectedSites.length}
          style={{ padding: "9px 24px", borderRadius: 8, background: syncing || !selectedSites.length ? "#888" : "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: syncing || !selectedSites.length ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {syncing ? "同期中..." : "同期実行"}
        </button>

        {syncResult && (
          <div style={{ marginTop: 14, background: "#f8f6f3", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>同期結果</div>
            {syncResult.map(r => (
              <div key={r.site} style={{ fontSize: 12, color: "#3a2a1a", marginBottom: 4 }}>
                {r.site}: 取得{r.scraped}件 / 新着{r.new}件 / 成約検知{r.sold}件 {r.errors > 0 && `/ エラー${r.errors}件`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#3a2a1a", fontWeight: 600 }}>
          {displayListings.length.toLocaleString()}件
        </span>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={filterSold} onChange={e => setFilterSold(e.target.checked)} />
          成約済みを表示
        </label>
      </div>

      {/* Listings table */}
      {loading ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 40 }}>読み込み中...</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8f6f3" }}>
                {["種別", "エリア", "最寄駅", "徒歩", "価格（万円）", "面積", "間取り", "初回確認", "最終確認", "状態"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "#888", borderBottom: "1px solid #e8e4e0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayListings.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "#aaa" }}>データがありません。同期を実行してください。</td></tr>
              )}
              {displayListings.slice(0, 200).map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f2f1ed", opacity: l.sold_detected_at ? 0.5 : 1 }}>
                  <td style={{ padding: "9px 12px" }}>{TYPE_LABELS[l.property_type ?? ""] ?? l.property_type ?? "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{l.address_city ?? "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{l.station_name ?? "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{l.station_walk ? `${l.station_walk}分` : "—"}</td>
                  <td style={{ padding: "9px 12px", fontWeight: 600 }}>
                    {l.price?.toLocaleString() ?? "—"}
                    {l.price_history && l.price_history.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#c05600" }} title={`前回: ${l.price_history[l.price_history.length - 1].price.toLocaleString()}万円`}>
                        ↓値下
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}>{l.area_m2 ? `${l.area_m2}㎡` : "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{l.rooms ?? "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#888" }}>{new Date(l.first_seen_at).toLocaleDateString("ja-JP")}</td>
                  <td style={{ padding: "9px 12px", color: "#888" }}>{new Date(l.last_seen_at).toLocaleDateString("ja-JP")}</td>
                  <td style={{ padding: "9px 12px" }}>
                    {l.sold_detected_at
                      ? <span style={{ background: "#fdeaea", color: "#8c1f1f", padding: "2px 8px", borderRadius: 12, fontSize: 10 }}>成約済み</span>
                      : <span style={{ background: "#e6f4ea", color: "#1a7737", padding: "2px 8px", borderRadius: 12, fontSize: 10 }}>掲載中</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
