"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParseResult, GeneratedContent } from "@/agents/document-parser";

// ============================================================
// 定数
// ============================================================

const PROPERTY_TYPE_OPTIONS = [
  { value: "NEW_HOUSE",    label: "新築戸建" },
  { value: "USED_HOUSE",   label: "中古戸建" },
  { value: "MANSION",      label: "マンション（中古）" },
  { value: "NEW_MANSION",  label: "新築マンション" },
  { value: "LAND",         label: "土地" },
];

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  required?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "property_type",  label: "物件種別",          type: "select",  required: true },
  { key: "price",          label: "価格（万円）",       type: "number",  required: true },
  { key: "city",           label: "市区町村",           type: "text",    required: true },
  { key: "address",        label: "番地以降",           type: "text" },
  { key: "station_line",   label: "路線名",             type: "text" },
  { key: "station_name",   label: "最寄駅",             type: "text",    required: true },
  { key: "station_walk",   label: "徒歩（分）",         type: "number",  required: true },
  { key: "rooms",          label: "間取り",             type: "text" },
  { key: "area_build_m2",  label: "建物面積（㎡）",     type: "number" },
  { key: "area_land_m2",   label: "土地面積（㎡）",     type: "number" },
  { key: "area_exclusive_m2", label: "専有面積（㎡）",  type: "number" },
  { key: "building_year",  label: "築年（西暦）",       type: "number" },
  { key: "structure",      label: "構造",               type: "text" },
  { key: "delivery_timing",label: "引渡し時期",         type: "text" },
  { key: "management_fee", label: "管理費（円/月）",    type: "number" },
  { key: "repair_reserve", label: "修繕積立金（円/月）",type: "number" },
  { key: "reins_number",   label: "レインズ番号",       type: "text" },
  { key: "bcr",            label: "建ぺい率（%）",      type: "number" },
  { key: "far",            label: "容積率（%）",        type: "number" },
];

// ============================================================
// スタイルヘルパー
// ============================================================

type Confidence = "high" | "medium" | "low";

function fieldBorderColor(conf?: Confidence): string {
  if (conf === "low")    return "#d9534f";
  if (conf === "medium") return "#f0ad4e";
  return "#e0deda";
}

function fieldBg(conf?: Confidence): string {
  if (conf === "low")    return "#fdf5f5";
  if (conf === "medium") return "#fffaf0";
  return "#fff";
}

// ============================================================
// コンポーネント
// ============================================================

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [dragging, setDragging]       = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState("");

  // Result state
  const [result, setResult]           = useState<ParseResult | null>(null);
  const [form, setForm]               = useState<Record<string, string>>({});

  // Register state
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    title: string; catch_copy: string; description_hp: string;
  } | null>(null);

  // ---- ファイル選択ハンドラ ----
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) {
      setParseError("PDF・JPG・PNG形式のみ対応しています");
      return;
    }
    setSelectedFile(file);
    setParseError("");
    setResult(null);
    setForm({});
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ---- 解析実行 ----
  const handleParse = async () => {
    if (!selectedFile) return;
    setParsing(true);
    setParseError("");
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/documents/parse", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "解析に失敗しました");
        return;
      }

      setResult(data as ParseResult);

      // フォーム初期値をセット
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.extracted ?? {})) {
        initial[k] = v !== null && v !== undefined ? String(v) : "";
      }
      setForm(initial);
    } catch {
      setParseError("通信エラーが発生しました");
    } finally {
      setParsing(false);
    }
  };

  // ---- 物件登録 ----
  const handleRegister = async () => {
    if (!result) return;

    const required = ["property_type", "price", "city"];
    for (const f of required) {
      if (!form[f]) {
        setRegisterError(`必須項目「${FIELDS.find((x) => x.key === f)?.label ?? f}」を入力してください`);
        return;
      }
    }

    setRegistering(true);
    setRegisterError("");

    try {
      const payload: Record<string, unknown> = { prefecture: "東京都" };
      for (const field of FIELDS) {
        const val = form[field.key];
        if (!val) continue;
        payload[field.key] = field.type === "number" ? Number(val) : val;
      }
      // AI生成コンテンツをペイロードに含める
      if (result.generated?.title) payload.title = result.generated.title;
      if (result.generated?.catch_copy) payload.catch_copy = result.generated.catch_copy;
      if (result.generated?.description_hp) payload.description_hp = result.generated.description_hp;
      if (result.generated?.description_portal) payload.description_portal = result.generated.description_portal;

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error ?? "登録に失敗しました");
        return;
      }

      const propertyId: string = data.property.id;

      // AIコンテンツ生成（登録後に非同期実行・失敗しても遷移）
      setGenerating(true);
      try {
        const genRes = await fetch(`/api/properties/${propertyId}/generate-content`, {
          method: "POST",
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          setGenerated({
            title: genData.content?.title ?? "",
            catch_copy: genData.content?.catch_copy ?? "",
            description_hp: genData.content?.description_hp ?? "",
          });
          // 2秒後に詳細ページへ
          setTimeout(() => router.push(`/admin/properties/${propertyId}`), 2000);
        } else {
          router.push(`/admin/properties/${propertyId}`);
        }
      } catch {
        router.push(`/admin/properties/${propertyId}`);
      } finally {
        setGenerating(false);
      }
    } catch {
      setRegisterError("通信エラーが発生しました");
    } finally {
      setRegistering(false);
    }
  };

  const confidence = (result?.confidence ?? {}) as Record<string, Confidence>;
  const needsReview = new Set(result?.needs_review ?? []);
  const isNeedsReview = (key: string) =>
    needsReview.has(key) ||
    [...needsReview].some((r) => r.startsWith(key));

  // ============================================================
  // Render
  // ============================================================

  return (
    <div style={{ padding: 28, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>← 物件一覧</button>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>PDF・画像から物件情報を取込</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>販売図面PDFまたは物件画像をアップロードすると、AIが物件情報を自動抽出します</p>
      </div>

      {/* Upload area */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#234f35" : "#c8c6c0"}`,
            borderRadius: 10,
            padding: "36px 24px",
            textAlign: "center",
            background: dragging ? "#f0f7f3" : "#fafaf8",
            cursor: selectedFile ? "default" : "pointer",
            transition: "all .15s",
          }}
        >
          {selectedFile ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{selectedFile.name}</div>
              <div style={{ fontSize: 11, color: "#706e68", marginBottom: 12 }}>
                {(selectedFile.size / 1024).toFixed(0)} KB
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setResult(null); setForm({}); setParseError(""); }}
                style={{ fontSize: 11, color: "#8c1f1f", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
              >
                ファイルを変更
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 12 }}>☁</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1c1b18", marginBottom: 6 }}>
                ここにファイルをドラッグ&ドロップ
              </div>
              <div style={{ fontSize: 12, color: "#706e68", marginBottom: 14 }}>または</div>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                ファイルを選択
              </button>
              <div style={{ fontSize: 11, color: "#706e68", marginTop: 10 }}>PDF・JPG・PNG（最大20MB）</div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />

        {parseError && (
          <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "8px 14px", borderRadius: 8, marginTop: 12, fontSize: 13 }}>
            {parseError}
          </div>
        )}

        {selectedFile && !result && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button
              onClick={handleParse}
              disabled={parsing}
              style={{
                padding: "10px 32px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: parsing ? "#888" : "#234f35", color: "#fff",
                border: "none", cursor: parsing ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {parsing ? "AI解析中..." : "解析開始"}
            </button>
            {parsing && (
              <p style={{ fontSize: 12, color: "#706e68", marginTop: 8 }}>
                AIが物件情報を読み取っています。しばらくお待ちください...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Parse result */}
      {result && (
        <div>
          {/* Summary bar */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#234f35" }}>✓ 解析完了</span>
            <span style={{ fontSize: 12, color: "#706e68" }}>
              {Object.keys(result.extracted).length}項目を抽出
            </span>
            {result.needs_review.length > 0 && (
              <span style={{ fontSize: 11, background: "#fff0e5", color: "#c05600", padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>
                要確認 {result.needs_review.length}件
              </span>
            )}
            {result.low_confidence_fields.length > 0 && (
              <span style={{ fontSize: 11, background: "#fdeaea", color: "#8c1f1f", padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>
                精度低 {result.low_confidence_fields.length}件
              </span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#fdf5f5", border: "1.5px solid #d9534f", borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#706e68" }}>精度低</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#fffaf0", border: "1.5px solid #f0ad4e", borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#706e68" }}>要確認</span>
              </div>
            </div>
          </div>

          {result.generated && (
            <div style={{ background: "#e6f4ea", border: "1px solid #a3d4b0", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#234f35", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>AI自動生成コンテンツ（プレビュー）</div>
              {result.generated.title && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>タイトル</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{result.generated.title}</div>
                </div>
              )}
              {result.generated.catch_copy && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>キャッチコピー</div>
                  <div style={{ fontSize: 13, color: "#234f35", fontWeight: 500 }}>{result.generated.catch_copy}</div>
                </div>
              )}
              {result.generated.description_hp && (
                <div>
                  <div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>HP掲載文（プレビュー）</div>
                  <div style={{ fontSize: 12, color: "#1c1b18", lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>{result.generated.description_hp}</div>
                </div>
              )}
            </div>
          )}

          {/* Fields form */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#706e68", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #e0deda" }}>
              抽出結果を確認・修正
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {FIELDS.map((field) => {
                const conf = confidence[field.key] as Confidence | undefined;
                const review = isNeedsReview(field.key);
                const border = fieldBorderColor(conf);
                const bg = fieldBg(conf);

                return (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>
                        {field.label}
                        {field.required && <span style={{ color: "#8c1f1f", marginLeft: 2 }}>*</span>}
                      </label>
                      {conf === "low" && (
                        <span style={{ fontSize: 9, background: "#fdeaea", color: "#8c1f1f", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>精度低</span>
                      )}
                      {conf === "medium" && (
                        <span style={{ fontSize: 9, background: "#fff0e5", color: "#c05600", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>要確認</span>
                      )}
                      {review && conf !== "low" && conf !== "medium" && (
                        <span style={{ fontSize: 9, background: "#fff0e5", color: "#c05600", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>要確認</span>
                      )}
                    </div>

                    {field.type === "select" ? (
                      <select
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        style={{ padding: "7px 10px", border: `1.5px solid ${border}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: bg }}
                      >
                        <option value="">選択してください</option>
                        {PROPERTY_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        style={{
                          padding: "7px 10px",
                          border: `1.5px solid ${border}`,
                          borderRadius: 7,
                          fontSize: 12,
                          fontFamily: "inherit",
                          background: bg,
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {registerError && (
            <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {registerError}
            </div>
          )}

          {generating && (
            <div style={{ background: "#e6f4ea", border: "1px solid #234f35", borderRadius: 8, padding: "14px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#234f35", marginBottom: 4 }}>✓ 物件登録完了 — AIコンテンツ生成中...</div>
              <div style={{ fontSize: 12, color: "#706e68" }}>タイトル・キャッチコピー・掲載文を自動生成しています</div>
            </div>
          )}
          {generated && (
            <div style={{ background: "#e6f4ea", border: "1px solid #234f35", borderRadius: 8, padding: "14px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#234f35", marginBottom: 10 }}>✓ AIコンテンツ生成完了 — 物件詳細ページへ移動します</div>
              {generated.title && <div style={{ fontSize: 12, marginBottom: 4 }}><b>タイトル:</b> {generated.title}</div>}
              {generated.catch_copy && <div style={{ fontSize: 12, marginBottom: 4 }}><b>キャッチ:</b> {generated.catch_copy}</div>}
            </div>
          )}

          {/* Register button */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setResult(null); setForm({}); setSelectedFile(null); }}
              style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}
            >
              やり直す
            </button>
            <button
              onClick={handleRegister}
              disabled={registering}
              style={{
                padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: registering ? "#888" : "#234f35", color: "#fff",
                border: "none", cursor: registering ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {registering ? "登録中..." : "この内容で登録する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
