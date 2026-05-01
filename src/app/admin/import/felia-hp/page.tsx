"use client";
import { useState, useRef } from "react";

const DEFAULT_AGENT: Record<string, string> = {
  sendagaya: "cmni6ylh3000513yyl8ia6qwz", // 伊藤 貴洋
  hatagaya:  "cmni6ylj2000p13yymn12t1lr", // 波多 隆二
};

type Store = "sendagaya" | "hatagaya";

export default function FeliaHpImportPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [store, setStore]         = useState<Store>("sendagaya");
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState<{
    inserted: number; skipped: number; errors: number; total: number;
    error_details?: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // CSV パーサ（簡易版・ダブルクォートのみ対応）
  const parseCsv = async (f: File): Promise<Record<string, unknown>[]> => {
    const buffer = await f.arrayBuffer();
    let text = new TextDecoder("shift-jis").decode(buffer);
    if (text.includes("�")) {
      text = new TextDecoder("utf-8").decode(buffer);
    }

    // ダブルクォート対応の行分割（カンマ単位）
    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuote = !inQuote; continue; }
        if (c === "," && !inQuote) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = splitLine(lines[0]);
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? null; });
      rows.push(row);
    }
    return rows;
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const rows = await parseCsv(file);
      if (rows.length === 0) {
        alert("CSVに有効なデータ行がありません");
        return;
      }
      const res = await fetch("/api/import/felia-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, default_agent_id: DEFAULT_AGENT[store] }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
      } else {
        alert("インポートに失敗しました: " + (data.error ?? ""));
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 8 }}>
        📥 旧システム物件インポート
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        旧フェリアHPの物件CSVをインポートします。
        物件番号は「F + 自社管理番号」で登録され、
        全物件 published_hp=true で公開状態になります。
      </p>

      {/* 店舗選択 */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 8 }}>
          店舗（担当者なし物件のデフォルト担当者）
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { value: "sendagaya" as Store, label: "千駄ヶ谷店（伊藤 貴洋）" },
            { value: "hatagaya"  as Store, label: "幡ヶ谷店（波多 隆二）" },
          ].map(opt => (
            <label key={opt.value} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 6, cursor: "pointer",
              border: `2px solid ${store === opt.value ? "#5BAD52" : "#e5e7eb"}`,
              background: store === opt.value ? "#f0fdf4" : "#fff",
              fontSize: 13, fontFamily: "inherit",
            }}>
              <input
                type="radio"
                value={opt.value}
                checked={store === opt.value}
                onChange={() => setStore(opt.value)}
                style={{ display: "none" }}
              />
              {store === opt.value ? "✅ " : ""}{opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ファイル選択 */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 8 }}>
          CSVファイル（Shift-JIS / UTF-8 対応）
        </label>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 6, cursor: "pointer",
          border: "2px dashed #d1d5db", background: "#f9fafb",
          fontSize: 13, color: "#374151",
        }}>
          📂 {file ? file.name : "CSVファイルを選択"}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* 注意書き */}
      <div style={{
        marginBottom: 20, padding: 14,
        background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: 6, fontSize: 12, color: "#92400e",
      }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>⚠️ インポート前の確認</div>
        <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>物件番号が重複している場合はスキップされます</li>
          <li>全物件が公開状態（published_hp=true）で登録されます</li>
          <li>画像は含まれません（別途アップロードが必要です）</li>
          <li>担当者なし物件は選択した店舗のデフォルト担当者で登録されます</li>
        </ul>
      </div>

      {file && (
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          style={{
            padding: "10px 28px", borderRadius: 6, border: "none",
            background: importing ? "#e5e7eb" : "#5BAD52",
            color: importing ? "#9ca3af" : "#fff",
            fontSize: 14, fontWeight: "bold",
            cursor: importing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {importing ? "⏳ インポート中..." : "📥 インポート実行"}
        </button>
      )}

      {importing && (
        <div style={{
          marginTop: 16, padding: 16,
          background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: 6, fontSize: 13, color: "#92400e", lineHeight: 1.7,
        }}>
          ⏳ インポート中です。画像のダウンロード・R2 アップロードがあるため
          数分〜十数分かかる場合があります。<br />
          このページを閉じないでください。
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 20, padding: 16,
          background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#166534", marginBottom: 8 }}>
            ✅ インポート完了
          </div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div>処理件数: {result.total}件</div>
            <div>新規登録: <strong>{result.inserted}件</strong></div>
            <div>スキップ（重複・必須欠落）: {result.skipped}件</div>
            <div>エラー: {result.errors}件</div>
          </div>
          {result.error_details && result.error_details.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>
              <div style={{ fontWeight: "bold" }}>エラー詳細（最初の10件）:</div>
              {result.error_details.map((e, i) => <div key={i}>・{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
