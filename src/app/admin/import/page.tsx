"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardSt: React.CSSProperties = {
  background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20,
};
const stepHeaderSt: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 16,
  paddingBottom: 10, borderBottom: "1px solid #f2f1ed",
};
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const selectSt: React.CSSProperties = {
  border: "1px solid #e0deda", borderRadius: 7, padding: "6px 10px",
  fontSize: 12, fontFamily: "inherit", background: "#fff", width: "100%",
};

// ── Displayable field labels ──────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  legacy_id: "物件番号", property_type: "物件種別", price: "価格（万円）",
  city: "市区町村", town: "町名", address: "番地以降", postal_code: "郵便番号",
  station_name1: "最寄り駅", station_walk1: "徒歩（分）", station_line1: "路線名",
  area_land_m2: "土地面積（㎡）", area_build_m2: "建物面積（㎡）",
  area_exclusive_m2: "専有面積（㎡）", rooms: "間取り",
  building_year: "築年（西暦）", building_month: "築月", structure: "構造",
  floors_total: "総階数", floor_unit: "所在階", reins_number: "レインズ番号",
  bcr: "建ぺい率（%）", far: "容積率（%）",
  management_fee: "管理費（円）", repair_reserve: "修繕積立金（円）",
  delivery_timing: "引渡し時期", title: "物件名", catch_copy: "キャッチコピー",
  status: "ステータス", seller_company: "元付業者名", seller_contact: "元付連絡先",
  internal_memo: "社内メモ",
};

// ── Felia HP Import Component ─────────────────────────────────────────────────

interface HpProgressEvent {
  type: "status" | "total" | "progress" | "done" | "error";
  message?: string;
  total?: number;
  index?: number;
  status?: "created" | "updated" | "skipped" | "error";
  created?: number;
  updated?: number;
  skipped?: number;
}

function FeliahpImportSection() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<HpProgressEvent[]>([]);
  const [done, setDone] = useState<{ created: number; updated: number; skipped: number; total: number } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startImport = async () => {
    setRunning(true);
    setLogs([]);
    setDone(null);

    const res = await fetch("/api/import/from-felia-hp", { method: "POST" });
    if (!res.ok || !res.body) {
      setLogs([{ type: "error", message: "接続に失敗しました" }]);
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.replace(/^data: /, "").trim();
        if (!line) continue;
        try {
          const evt = JSON.parse(line) as HpProgressEvent;
          setLogs(prev => [...prev, evt]);
          if (evt.type === "done") {
            setDone({ created: evt.created ?? 0, updated: evt.updated ?? 0, skipped: evt.skipped ?? 0, total: evt.total ?? 0 });
          }
        } catch { /* ignore malformed */ }
      }
    }
    setRunning(false);
  };

  const totalCount = logs.find(l => l.type === "total")?.total ?? 0;
  const progressCount = logs.filter(l => l.type === "progress").length;

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 4 }}>自社HPから一括取込</div>
      <div style={{ fontSize: 12, color: "#706e68", marginBottom: 16 }}>
        フェリアホームHP（felia-home.co.jp）に掲載中の全物件をハトサポシステム経由で取込します。<br />
        既存物件は物件番号で照合し上書き更新、新規物件は新規登録します。
      </div>

      {!running && !done && (
        <button onClick={startImport}
          style={{ padding: "9px 24px", borderRadius: 8, background: "#234f35", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          取込を開始する
        </button>
      )}

      {(running || logs.length > 0) && (
        <div>
          {totalCount > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#706e68", marginBottom: 4 }}>
                <span>{running ? `処理中: ${progressCount} / ${totalCount}件` : "完了"}</span>
                <span>{totalCount > 0 ? Math.round((progressCount / totalCount) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: "#f2f1ed", borderRadius: 99 }}>
                <div style={{ height: "100%", borderRadius: 99, background: "#234f35", width: `${totalCount > 0 ? Math.min(100, Math.round((progressCount / totalCount) * 100)) : 0}%`, transition: "width .3s" }} />
              </div>
            </div>
          )}

          <div style={{ background: "#1c1b18", borderRadius: 8, padding: "12px 14px", maxHeight: 240, overflowY: "auto", fontSize: 11, fontFamily: "monospace", color: "#d4d0c8" }}>
            {logs.map((l, i) => (
              <div key={i} style={{ marginBottom: 2, color: l.type === "error" || l.status === "error" ? "#f08080" : l.status === "created" ? "#90ee90" : l.status === "updated" ? "#87ceeb" : "#d4d0c8" }}>
                {l.message ?? JSON.stringify(l)}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {done && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {[
              { label: "合計", value: done.total, color: "#3a2a1a" },
              { label: "新規登録", value: done.created, color: "#234f35" },
              { label: "更新", value: done.updated, color: "#1a56a0" },
              { label: "スキップ", value: done.skipped, color: done.skipped > 0 ? "#8c1f1f" : "#888" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#f8f6f3", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setLogs([]); setDone(null); }}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              再実行
            </button>
            <Link href="/admin/properties" style={{ padding: "8px 18px", borderRadius: 8, background: "#234f35", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
              物件一覧を確認
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CsvImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Step 2: mappings & preview
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Step 4: result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("CSVファイルを選択してください");
      return;
    }
    setSelectedFile(file);
    setError("");
    setStep(1);
    setResult(null);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Step 1 → 2: Preview ──
  const loadPreview = async () => {
    if (!selectedFile) return;
    setLoadingPreview(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("mode", "preview");
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setError(`サーバーエラー（${res.status}）が発生しました。しばらく待ってから再試行してください。`);
        return;
      }
      const data = await res.json() as { headers: string[]; mappings: Record<string, string>; preview: Record<string, string>[]; total: number; error?: string };
      if (!res.ok) { setError(data.error ?? "プレビューに失敗しました"); return; }
      setHeaders(data.headers);
      setMappings(data.mappings);
      setPreview(data.preview);
      setTotalRows(data.total);
      setStep(2);
    } catch (e) {
      setError(`プレビューに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Step 3 → 4: Import ──
  const runImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("mode", "import");
      fd.append("mappings", JSON.stringify(mappings));
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setError(`サーバーエラー（${res.status}）が発生しました。しばらく待ってから再試行してください。`);
        return;
      }
      const data = await res.json() as ImportResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "インポートに失敗しました"); return; }
      setResult(data);
      setStep(4);
    } catch (e) {
      setError(`インポートに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedFile(null); setHeaders([]); setMappings({});
    setPreview([]); setTotalRows(0); setResult(null); setError("");
  };

  // ── Render ──
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a" }}>物件データ一括インポート</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>CSVファイルから物件データを一括登録します</p>
        </div>
        <Link href="/admin/properties" style={{ fontSize: 13, color: "#8c1f1f", textDecoration: "none" }}>← 物件一覧</Link>
      </div>

      {/* Felia HP import */}
      <FeliahpImportSection />

      <div style={{ fontSize: 14, fontWeight: 600, color: "#3a2a1a", marginBottom: 16 }}>CSVファイルからインポート</div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {["ファイル選択", "マッピング確認", "プレビュー", "完了"].map((label, i) => (
          <div key={label} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{
              flex: 1, padding: "10px 16px", textAlign: "center", fontSize: 12, fontWeight: 600,
              background: step === i + 1 ? "#8c1f1f" : step > i + 1 ? "#234f35" : "#f8f6f3",
              color: step >= i + 1 ? "#fff" : "#aaa",
              borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0,
            }}>
              {step > i + 1 ? "✓ " : `${i + 1}. `}{label}
            </div>
            {i < 3 && <div style={{ width: 0, height: 0, borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderLeft: `10px solid ${step > i + 1 ? "#234f35" : step === i + 1 ? "#8c1f1f" : "#f8f6f3"}` }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#fde8e8", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Step 1: File selection */}
      {step === 1 && (
        <div style={cardSt}>
          <div style={stepHeaderSt}>【ステップ1】CSVファイルを選択</div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#8c1f1f" : "#c8c6c0"}`,
              borderRadius: 10, padding: "40px 24px", textAlign: "center",
              background: dragging ? "#fff8f8" : "#fafaf8",
              cursor: selectedFile ? "default" : "pointer", transition: "all .15s",
            }}
          >
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{selectedFile.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                <button onClick={e => { e.stopPropagation(); reset(); }}
                  style={{ fontSize: 12, color: "#8c1f1f", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                  ファイルを変更
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>CSVファイルをドラッグ&ドロップ</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>または</div>
                <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  style={{ padding: "8px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  ファイルを選択
                </button>
                <div style={{ fontSize: 11, color: "#888", marginTop: 10 }}>UTF-8・Shift-JIS 対応</div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

          {/* Format guide */}
          <div style={{ marginTop: 20, background: "#f8f6f3", borderRadius: 10, padding: 16, fontSize: 12, color: "#5a4a3a" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>対応フォーマット</div>
            <div>• felia-home.co.jp の物件エクスポートCSV</div>
            <div style={{ marginTop: 4 }}>• SUUMO / athome の物件CSVエクスポート</div>
            <div style={{ marginTop: 4 }}>• 独自CSV（自動カラムマッピング対応）</div>
            <div style={{ marginTop: 8, color: "#888" }}>自動検出されるカラム名: 物件番号・物件種別・価格・市区町村・最寄り駅・徒歩・土地面積・建物面積・間取り・築年 など</div>
          </div>

          {selectedFile && (
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button onClick={loadPreview} disabled={loadingPreview}
                style={{ padding: "10px 28px", borderRadius: 8, background: loadingPreview ? "#888" : "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: loadingPreview ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {loadingPreview ? "解析中..." : "次へ →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Column mapping */}
      {step === 2 && (
        <div style={cardSt}>
          <div style={stepHeaderSt}>
            【ステップ2】カラムマッピング確認
            <span style={{ fontSize: 11, fontWeight: 400, color: "#888", marginLeft: 12 }}>CSV列名 → システム項目の対応を確認・修正してください</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <div key={field} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#3a2a1a", fontWeight: mappings[field] ? 600 : 400 }}>{label}</div>
                <select value={mappings[field] ?? ""} onChange={e => setMappings(m => ({ ...m, [field]: e.target.value }))} style={selectSt}>
                  <option value="">（未設定）</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← 戻る</button>
            <button onClick={() => setStep(3)} style={{ padding: "9px 28px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>プレビュー確認 →</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div style={cardSt}>
          <div style={stepHeaderSt}>
            【ステップ3】プレビュー（先頭5件）
          </div>
          <div style={{ marginBottom: 16, display: "flex", gap: 16, fontSize: 13 }}>
            <span style={{ color: "#234f35", fontWeight: 600 }}>取込予定: {totalRows}件</span>
            <span style={{ color: "#888" }}>マッピング項目: {Object.values(mappings).filter(Boolean).length}列</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8f6f3" }}>
                  {Object.entries(mappings).filter(([, v]) => v).map(([field, header]) => (
                    <th key={field} style={{ padding: "8px 12px", textAlign: "left", color: "#5a4a3a", fontWeight: 600, borderBottom: "1px solid #e8e4e0", whiteSpace: "nowrap" }}>
                      {FIELD_LABELS[field] ?? field}
                      <span style={{ display: "block", fontSize: 10, color: "#aaa", fontWeight: 400 }}>{header}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f2f1ed" }}>
                    {Object.entries(mappings).filter(([, v]) => v).map(([field, header]) => (
                      <td key={field} style={{ padding: "8px 12px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalRows > 5 && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>…他 {totalRows - 5} 件</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← マッピング修正</button>
            <button onClick={runImport} disabled={importing}
              style={{ padding: "9px 28px", borderRadius: 8, background: importing ? "#888" : "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {importing ? "インポート中..." : `インポート実行（${totalRows}件）`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <div style={cardSt}>
          <div style={stepHeaderSt}>【完了】インポート結果</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "合計", value: result.total, color: "#3a2a1a" },
              { label: "新規登録", value: result.created, color: "#234f35" },
              { label: "更新", value: result.updated, color: "#1a56a0" },
              { label: "スキップ", value: result.skipped, color: result.skipped > 0 ? "#8c1f1f" : "#888" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#f8f6f3", borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#8a5200", marginBottom: 8 }}>エラー詳細</div>
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#5a4a3a", marginBottom: 4 }}>
                    行{e.row}: {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={reset} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>続けてインポート</button>
            <Link href="/admin/properties" style={{ padding: "9px 24px", borderRadius: 8, background: "#234f35", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>物件一覧を確認</Link>
          </div>
        </div>
      )}
    </div>
  );
}
