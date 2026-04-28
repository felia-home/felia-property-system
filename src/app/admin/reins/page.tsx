"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// 動的にSheetJSを読み込む（クライアントサイドのみ）
const parseExcelFile = async (file: File): Promise<unknown[][]> => {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
};

const parseCsvFile = async (file: File): Promise<unknown[][]> => {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  // Shift-JIS優先で試し、文字化けしたらUTF-8で再試行
  let text = new TextDecoder("shift-jis").decode(buffer);
  if (text.includes("�")) {
    text = new TextDecoder("utf-8").decode(buffer);
  }

  return text.split(/\r?\n/).map(line =>
    line.split(",").map(cell => {
      const v = cell.trim().replace(/^"|"$/g, "");
      return v === "" ? null : v;
    })
  );
};

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
  const [areaFilter, setAreaFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // 統計
  const [stats, setStats] = useState<{
    byType: Record<string, { area: string; count: number }[]>;
    totals: { MANSION: number; HOUSE: number; LAND: number; total: number };
  } | null>(null);
  const [showStats, setShowStats] = useState(false);

  // インポート
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    source_type: string;
    inserted: number;
    skipped: number;
    errors: number;
    total: number;
  } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // 重複除去
  type DedupSample = {
    source_type: string;
    address: string;
    building_name?: string | null;
    floor?: number | null;
    area_m2?: number | null;
    area_build_m2?: number | null;
    area_land_m2?: number | null;
    count: number;
  };
  const [dedupInfo, setDedupInfo] = useState<{
    duplicate_groups: number;
    total_to_remove: number;
    samples: DedupSample[];
  } | null>(null);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupResult, setDedupResult] = useState<{
    deactivated: number;
    active_count: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (sourceType) params.set("source_type", sourceType);
      if (areaFilter) params.set("area", areaFilter);
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
  }, [q, sourceType, areaFilter, priceMin, priceMax, page]);

  useEffect(() => { load(); }, [load]);

  // 統計取得
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/reins/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  // 重複確認（ドライラン）
  const handleCheckDuplicates = async () => {
    setDedupLoading(true);
    try {
      const res = await fetch("/api/reins/dedup");
      const data = await res.json();
      setDedupInfo(data);
      setDedupResult(null);
    } finally {
      setDedupLoading(false);
    }
  };

  // 重複除去実行
  const handleDedup = async () => {
    if (!confirm(
      `重複物件 ${dedupInfo?.total_to_remove}件 を非表示にします。\n` +
      `（最古の1件を残してその他を無効化）\n\nよろしいですか？`
    )) return;

    setDedupLoading(true);
    try {
      const res = await fetch("/api/reins/dedup", { method: "POST" });
      const data = await res.json();
      setDedupResult(data);
      setDedupInfo(null);
      await load();
    } finally {
      setDedupLoading(false);
    }
  };

  // インポート実行
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      let rows: unknown[][];
      if (importFile.name.toLowerCase().endsWith(".csv")) {
        rows = await parseCsvFile(importFile);
      } else {
        rows = await parseExcelFile(importFile);
      }

      // 連番が数値の有効行のみ
      const validRows = rows.filter(row =>
        Array.isArray(row) && row.length > 2 && row[0] !== null && !isNaN(Number(row[0]))
      );

      if (validRows.length === 0) {
        alert("有効なデータ行がありません");
        return;
      }

      const BATCH = 1000;
      let totalInserted = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      let sourceType = "";

      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH);
        const res = await fetch("/api/reins/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const data = await res.json();
        if (data.ok) {
          totalInserted += data.inserted;
          totalSkipped  += data.skipped;
          totalErrors   += data.errors;
          sourceType     = data.source_type;
        } else {
          alert(`バッチ${i / BATCH + 1}でエラー: ${data.error ?? "不明"}`);
          break;
        }
      }

      setImportResult({
        source_type: sourceType,
        inserted:    totalInserted,
        skipped:     totalSkipped,
        errors:      totalErrors,
        total:       validRows.length,
      });

      await loadStats();
      await load();
    } catch (err) {
      console.error(err);
      alert("インポートに失敗しました");
    } finally {
      setImporting(false);
      setImportFile(null);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>レインズ物件</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            会員限定公開のレインズデータ。全{total.toLocaleString()}件
          </p>
        </div>

        {/* 重複除去・インポートセクション */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowImport(v => !v)}
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #d1d5db",
              background: showImport ? "#f3f4f6" : "#fff",
              color: "#374151", fontWeight: "bold",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            📥 インポート
          </button>

          <button
            type="button"
            onClick={handleCheckDuplicates}
            disabled={dedupLoading}
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #fcd34d", background: "#fffbeb",
              color: "#92400e", cursor: dedupLoading ? "not-allowed" : "pointer",
              fontWeight: "bold", fontFamily: "inherit",
            }}
          >
            {dedupLoading ? "確認中..." : "🔍 重複を確認"}
          </button>

          {dedupInfo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 14px", borderRadius: 6,
              background: dedupInfo.total_to_remove > 0 ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${dedupInfo.total_to_remove > 0 ? "#fca5a5" : "#86efac"}`,
            }}>
              <span style={{ fontSize: 13, color: "#374151" }}>
                重複グループ: <strong>{dedupInfo.duplicate_groups}</strong>件 /
                削除候補: <strong>{dedupInfo.total_to_remove}</strong>件
              </span>
              {dedupInfo.total_to_remove > 0 && (
                <button
                  type="button"
                  onClick={handleDedup}
                  disabled={dedupLoading}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12,
                    border: "none", background: "#ef4444",
                    color: "#fff", cursor: dedupLoading ? "not-allowed" : "pointer",
                    fontWeight: "bold", fontFamily: "inherit",
                  }}
                >
                  重複を除去する
                </button>
              )}
            </div>
          )}

          {dedupResult && (
            <div style={{
              padding: "8px 14px", borderRadius: 6,
              background: "#f0fdf4", border: "1px solid #86efac",
              fontSize: 13, color: "#166534",
            }}>
              ✅ {dedupResult.deactivated}件を非表示にしました
              （残り: {dedupResult.active_count.toLocaleString()}件）
            </div>
          )}
        </div>
      </div>

      {/* 重複サンプル表示 */}
      {dedupInfo && dedupInfo.samples.length > 0 && (
        <div style={{
          marginBottom: 16, padding: 12,
          background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
        }}>
          <div style={{ fontWeight: "bold", color: "#92400e", marginBottom: 8, fontSize: 13 }}>
            重複物件の例（上位30件）
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#6b7280", borderBottom: "1px solid #fde68a" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>種別</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>住所</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>マンション名</th>
                <th style={{ textAlign: "center", padding: "4px 8px" }}>階</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>面積</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>建物面積</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>土地面積</th>
                <th style={{ textAlign: "center", padding: "4px 8px" }}>重複数</th>
              </tr>
            </thead>
            <tbody>
              {dedupInfo.samples.map((s, i) => (
                <tr key={i} style={{ borderTop: "1px solid #fde68a" }}>
                  <td style={{ padding: "4px 8px" }}>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: "bold",
                      background: s.source_type === "MANSION" ? "#eff6ff"
                        : s.source_type === "HOUSE" ? "#f0fdf4" : "#fefce8",
                      color: "#374151",
                    }}>
                      {s.source_type === "MANSION" ? "マンション"
                        : s.source_type === "HOUSE" ? "戸建て" : "土地"}
                    </span>
                  </td>
                  <td style={{ padding: "4px 8px" }}>{s.address}</td>
                  <td style={{ padding: "4px 8px", color: s.building_name ? "#374151" : "#9ca3af" }}>
                    {s.building_name ?? "（名称なし）"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "center" }}>
                    {s.floor != null ? `${s.floor}階` : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    {s.area_m2 != null ? `${s.area_m2}㎡` : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    {s.area_build_m2 != null ? `${s.area_build_m2}㎡` : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    {s.area_land_m2 != null ? `${s.area_land_m2}㎡` : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "center", color: "#ef4444", fontWeight: "bold" }}>
                    {s.count}件
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* インポートパネル */}
      {showImport && (
        <div style={{
          marginBottom: 16, padding: 20,
          background: "#f9fafb", border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#374151", marginBottom: 12 }}>
            レインズデータのインポート
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            整形前の Excel（.xlsx）または CSV（.csv）ファイルをアップロードしてください。<br />
            マンション・戸建て・土地は自動判別されます。重複データはスキップされます。
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 6, fontSize: 13,
              background: "#fff", border: "2px dashed #d1d5db",
              cursor: "pointer", color: "#374151",
            }}>
              📂 {importFile ? importFile.name : "ファイルを選択"}
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={e => setImportFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {importFile && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "none",
                  background: importing ? "#e5e7eb" : "#5BAD52",
                  color: importing ? "#9ca3af" : "#fff",
                  fontSize: 13, fontWeight: "bold",
                  cursor: importing ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {importing ? "インポート中..." : "インポート実行"}
              </button>
            )}
          </div>

          {importResult && (
            <div style={{
              marginTop: 14, padding: "12px 16px",
              background: "#f0fdf4", border: "1px solid #86efac",
              borderRadius: 6, fontSize: 13,
            }}>
              <div style={{ fontWeight: "bold", color: "#166534", marginBottom: 6 }}>
                ✅ インポート完了（{importResult.source_type === "MANSION" ? "マンション"
                  : importResult.source_type === "HOUSE" ? "戸建て" : "土地"}）
              </div>
              <div style={{ color: "#374151", lineHeight: 1.8 }}>
                処理件数: {importResult.total.toLocaleString()}件<br />
                新規登録: <strong>{importResult.inserted.toLocaleString()}件</strong><br />
                スキップ（重複）: {importResult.skipped.toLocaleString()}件<br />
                エラー: {importResult.errors}件
              </div>
            </div>
          )}
        </div>
      )}

      {/* 統計サマリー */}
      {stats && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "MANSION", label: "マンション", color: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
              { key: "HOUSE",   label: "戸建て",     color: "#f0fdf4", border: "#86efac", text: "#166534" },
              { key: "LAND",    label: "土地",       color: "#fefce8", border: "#fde68a", text: "#92400e" },
            ].map(({ key, label, color, border, text }) => (
              <div key={key} style={{
                padding: "10px 16px", borderRadius: 8,
                background: color, border: `1px solid ${border}`,
                minWidth: 140,
              }}>
                <div style={{ fontSize: 11, color: text, fontWeight: "bold", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: text }}>
                  {stats.totals[key as keyof typeof stats.totals].toLocaleString()}
                  <span style={{ fontSize: 12, fontWeight: "normal", marginLeft: 2 }}>件</span>
                </div>
              </div>
            ))}
            <div style={{
              padding: "10px 16px", borderRadius: 8,
              background: "#f9fafb", border: "1px solid #e5e7eb",
              minWidth: 140,
            }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: "bold", marginBottom: 2 }}>合計</div>
              <div style={{ fontSize: 22, fontWeight: "bold", color: "#374151" }}>
                {stats.totals.total.toLocaleString()}
                <span style={{ fontSize: 12, fontWeight: "normal", marginLeft: 2 }}>件</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStats(v => !v)}
              style={{
                padding: "8px 14px", borderRadius: 6, fontSize: 12,
                border: "1px solid #d1d5db", background: "#fff",
                cursor: "pointer", alignSelf: "center",
                color: "#374151", fontFamily: "inherit",
              }}
            >
              {showStats ? "▲ 区別内訳を閉じる" : "▼ 区別内訳を見る"}
            </button>

            {areaFilter && (
              <div style={{
                padding: "6px 12px", borderRadius: 16,
                background: "#fff7ed", border: "1px solid #fdba74",
                fontSize: 12, color: "#9a3412",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                絞込中: <strong>{areaFilter}</strong>
                <button
                  type="button"
                  onClick={() => { setAreaFilter(""); setPage(1); }}
                  style={{ background: "none", border: "none", color: "#9a3412", cursor: "pointer", fontSize: 14, padding: 0, fontFamily: "inherit" }}
                  aria-label="区フィルタを解除"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {showStats && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12, padding: 16,
              background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
            }}>
              {[
                { key: "MANSION", label: "マンション", color: "#1d4ed8" },
                { key: "HOUSE",   label: "戸建て",     color: "#166534" },
                { key: "LAND",    label: "土地",       color: "#92400e" },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <div style={{
                    fontSize: 12, fontWeight: "bold", color,
                    marginBottom: 8, paddingBottom: 4,
                    borderBottom: `2px solid ${color}`,
                  }}>
                    {label}（{stats.totals[key as keyof typeof stats.totals].toLocaleString()}件）
                  </div>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {stats.byType[key]?.map(({ area, count }) => (
                      <div key={area} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "3px 0", fontSize: 12,
                        borderBottom: "1px solid #f3f4f6",
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAreaFilter(area);
                            setPage(1);
                            setShowStats(false);
                          }}
                          style={{
                            background: "none", border: "none",
                            color: "#374151", cursor: "pointer",
                            fontSize: 12, padding: 0, textAlign: "left",
                            fontFamily: "inherit",
                          }}
                        >
                          {area}
                        </button>
                        <span style={{ color: "#6b7280", fontWeight: "bold" }}>
                          {count.toLocaleString()}件
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          onClick={() => { setQ(""); setSourceType(""); setAreaFilter(""); setPriceMin(""); setPriceMax(""); setPage(1); }}
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
