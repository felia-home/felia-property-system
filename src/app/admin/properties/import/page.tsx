"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ParseResult, GeneratedContent, MultiUnitInfo } from "@/agents/document-parser";
import { Suspense } from "react";

// ============================================================
// 定数
// ============================================================

const PROPERTY_TYPE_OPTIONS = [
  { value: "NEW_HOUSE",   label: "新築戸建" },
  { value: "USED_HOUSE",  label: "中古戸建" },
  { value: "MANSION",     label: "マンション（中古）" },
  { value: "NEW_MANSION", label: "新築マンション" },
  { value: "LAND",        label: "土地" },
];

interface FieldDef { key: string; label: string; type: "text" | "number" | "select"; required?: boolean }

const FIELDS: FieldDef[] = [
  { key: "property_type",  label: "物件種別",          type: "select",  required: true },
  { key: "price",          label: "価格（万円）",       type: "number",  required: true },
  { key: "city",           label: "市区町村",           type: "text",    required: true },
  { key: "town",           label: "町名・丁目",         type: "text" },
  { key: "address",        label: "番地以降",           type: "text" },
  { key: "station_line1",  label: "路線名",             type: "text" },
  { key: "station_name1",  label: "最寄駅",             type: "text",    required: true },
  { key: "station_walk1",  label: "徒歩（分）",         type: "number",  required: true },
  { key: "rooms",          label: "間取り",             type: "text" },
  { key: "area_build_m2",  label: "建物面積（㎡）",     type: "number" },
  { key: "area_land_m2",   label: "土地面積（㎡）",     type: "number" },
  { key: "area_exclusive_m2", label: "専有面積（㎡）",  type: "number" },
  { key: "building_year",  label: "築年（西暦）",       type: "number" },
  { key: "structure",      label: "構造",               type: "text" },
  { key: "direction",      label: "向き",               type: "text" },
  { key: "delivery_timing",label: "引渡し時期",         type: "text" },
  { key: "management_fee", label: "管理費（円/月）",    type: "number" },
  { key: "repair_reserve", label: "修繕積立金（円/月）",type: "number" },
  { key: "reins_number",   label: "レインズ番号",       type: "text" },
  { key: "bcr",            label: "建ぺい率（%）",      type: "number" },
  { key: "far",            label: "容積率（%）",        type: "number" },
];

const SELLER_FIELDS: FieldDef[] = [
  { key: "seller_company",          label: "元付業者名",     type: "text" },
  { key: "seller_contact",          label: "連絡先（電話）", type: "text" },
  { key: "seller_transaction_type", label: "取引態様（元付）",type: "text" },
];

const SOURCE_TYPE_OPTIONS = ["SUUMO", "athome", "HOME'S", "Yahoo不動産", "その他"];

// ============================================================
// スタイル
// ============================================================

type Confidence = "high" | "medium" | "low";

const fieldBorderColor = (conf?: Confidence) =>
  conf === "low" ? "#d9534f" : conf === "medium" ? "#f0ad4e" : "#e0deda";
const fieldBg = (conf?: Confidence) =>
  conf === "low" ? "#fdf5f5" : conf === "medium" ? "#fffaf0" : "#fff";

// ============================================================
// Extract-result form (shared between PDF and URL tabs)
// ============================================================

interface DuplicateMatch {
  id: string; property_number: string | null; title: string | null;
  city: string; town: string | null; address: string;
  price: number; rooms: string | null; status: string;
  area_land_m2: number | null; area_build_m2: number | null; area_exclusive_m2: number | null;
}

interface ResultFormProps {
  result: ParseResult | TextParseResult;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  generated?: GeneratedContent | null;
  registering: boolean;
  registerError: string;
  checkingDuplicate: boolean;
  showDuplicateWarning: boolean;
  duplicates: DuplicateMatch[];
  multiUnit?: MultiUnitInfo;
  multiUnitMode: "single" | "separate";
  onMultiUnitModeChange: (mode: "single" | "separate") => void;
  onRegister: () => void;
  onReset: () => void;
  onDismissDuplicate: () => void;
}

function ResultForm({
  result, form, setForm, generated, registering, registerError,
  checkingDuplicate, showDuplicateWarning, duplicates,
  multiUnit, multiUnitMode, onMultiUnitModeChange,
  onRegister, onReset, onDismissDuplicate,
}: ResultFormProps) {
  const confidence = (result.confidence ?? {}) as Record<string, Confidence>;
  const needsReview = new Set(result.needs_review ?? []);
  const isNeedsReview = (key: string) =>
    needsReview.has(key) || [...needsReview].some(r => r.startsWith(key));

  return (
    <div>
      {/* Summary */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#234f35" }}>✓ 解析完了</span>
        <span style={{ fontSize: 12, color: "#706e68" }}>{Object.keys(result.extracted).length}項目を抽出</span>
        {result.needs_review.length > 0 && (
          <span style={{ fontSize: 11, background: "#fff0e5", color: "#c05600", padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>要確認 {result.needs_review.length}件</span>
        )}
        {result.low_confidence_fields.length > 0 && (
          <span style={{ fontSize: 11, background: "#fdeaea", color: "#8c1f1f", padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>精度低 {result.low_confidence_fields.length}件</span>
        )}
      </div>

      {/* 多棟検出 */}
      {multiUnit?.detected && multiUnit.units.length > 1 && (
        <div style={{ background: "#e8f0fe", border: "2px solid #4285f4", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a56db", marginBottom: 14 }}>
            🏠 複数棟が検出されました（{multiUnit.units.map(u => u.name).join("・")}）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 14px", background: multiUnitMode === "separate" ? "#fff" : "transparent", borderRadius: 8, border: multiUnitMode === "separate" ? "2px solid #4285f4" : "2px solid transparent" }}>
              <input type="radio" name="multi_unit" checked={multiUnitMode === "separate"} onChange={() => onMultiUnitModeChange("separate")} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>棟ごとに別々の物件として登録（推奨）</div>
                <div style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
                  {multiUnit.units.map(u => (
                    <div key={u.name} style={{ marginBottom: 2 }}>
                      → {u.name}: {u.price ? `${u.price.toLocaleString()}万円` : "—"} / {u.rooms ?? "—"} / {u.area_build_m2 ? `${u.area_build_m2}㎡` : u.area_land_m2 ? `${u.area_land_m2}㎡` : "—"}
                    </div>
                  ))}
                  <div style={{ marginTop: 2, color: "#888" }}>それぞれ独立した物件として{multiUnit.units.length}件登録</div>
                </div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 14px", background: multiUnitMode === "single" ? "#fff" : "transparent", borderRadius: 8, border: multiUnitMode === "single" ? "2px solid #4285f4" : "2px solid transparent" }}>
              <input type="radio" name="multi_unit" checked={multiUnitMode === "single"} onChange={() => onMultiUnitModeChange("single")} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>まとめて1物件として登録</div>
                <div style={{ fontSize: 12, color: "#706e68", marginTop: 2 }}>
                  「{multiUnit.units.map(u => u.name).join("＆")}」として1件登録
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* AI generated content */}
      {generated && (
        <div style={{ background: "#e6f4ea", border: "1px solid #a3d4b0", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#234f35", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>AI自動生成コンテンツ（プレビュー）</div>
          {generated.title && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>タイトル</div><div style={{ fontSize: 13, fontWeight: 500 }}>{generated.title}</div></div>}
          {generated.catch_copy && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>キャッチコピー</div><div style={{ fontSize: 13, color: "#234f35", fontWeight: 500 }}>{generated.catch_copy}</div></div>}
          {generated.description_hp && <div><div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>HP掲載文（プレビュー）</div><div style={{ fontSize: 12, lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>{generated.description_hp}</div></div>}
        </div>
      )}

      {/* Seller info — highlighted orange box */}
      <div style={{ background: "#fff8e1", border: "2px solid #f39c12", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8a5200", marginBottom: 10 }}>
          ⚠️ 元付業者情報（内部管理のみ・HP・ポータルに掲載されません）
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SELLER_FIELDS.map(field => {
            const conf = confidence[field.key] as Confidence | undefined;
            return (
              <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>{field.label}</label>
                <input
                  type="text"
                  value={form[field.key] ?? ""}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  style={{ padding: "7px 10px", border: `1.5px solid ${fieldBorderColor(conf)}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: fieldBg(conf), width: "100%", boxSizing: "border-box" }}
                />
              </div>
            );
          })}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>広告転載承諾</label>
            <select value={form.ad_transfer_consent ?? "あり"} onChange={e => setForm(f => ({ ...f, ad_transfer_consent: e.target.value }))}
              style={{ padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
              <option value="あり">あり</option>
              <option value="なし">なし・要確認</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main fields */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#706e68", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #e0deda" }}>
          抽出結果を確認・修正
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {FIELDS.map(field => {
            const conf = confidence[field.key] as Confidence | undefined;
            const review = isNeedsReview(field.key);
            return (
              <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>
                    {field.label}{field.required && <span style={{ color: "#8c1f1f", marginLeft: 2 }}>*</span>}
                  </label>
                  {conf === "low" && <span style={{ fontSize: 9, background: "#fdeaea", color: "#8c1f1f", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>精度低</span>}
                  {(conf === "medium" || (review && conf !== "low")) && <span style={{ fontSize: 9, background: "#fff0e5", color: "#c05600", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>要確認</span>}
                </div>
                {field.type === "select" ? (
                  <select value={form[field.key] ?? ""} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    style={{ padding: "7px 10px", border: `1.5px solid ${fieldBorderColor(conf)}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: fieldBg(conf) }}>
                    <option value="">選択してください</option>
                    {PROPERTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={form[field.key] ?? ""} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    style={{ padding: "7px 10px", border: `1.5px solid ${fieldBorderColor(conf)}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: fieldBg(conf), width: "100%", boxSizing: "border-box" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {registerError && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{registerError}</div>}

      {/* 重複警告 */}
      {showDuplicateWarning && duplicates.length > 0 && (
        <div style={{ background: "#fff8e1", border: "2px solid #f0ad4e", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#8a5200", marginBottom: 14 }}>
            ⚠️ 類似物件が既に登録されています
          </div>
          {duplicates.map(d => {
            const area = d.area_exclusive_m2 ?? d.area_build_m2 ?? d.area_land_m2;
            const statusLabel: Record<string, string> = {
              DRAFT: "下書き", REVIEW: "レビュー中", PENDING: "確認待ち",
              APPROVED: "承認済み", PUBLISHED_HP: "HP掲載中", PUBLISHED_ALL: "全掲載中",
              SUSPENDED: "一時停止", SOLD: "成約済み",
            };
            return (
              <div key={d.id} style={{ background: "#fff", border: "1px solid #e0deda", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {d.property_number ?? "—"}　{d.city}{d.town ?? ""}{d.address}
                </div>
                <div style={{ fontSize: 12, color: "#706e68", marginBottom: 8 }}>
                  {d.price ? `${d.price.toLocaleString()}万円` : "—"} / {d.rooms ?? "—"} / {area ? `${area}㎡` : "—"}
                  　ステータス: {statusLabel[d.status] ?? d.status}
                </div>
                <a href={`/admin/properties/${d.id}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#234f35", fontWeight: 500, textDecoration: "underline" }}>
                  既存物件を開く →
                </a>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={onDismissDuplicate}
              style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              戻る
            </button>
            <button onClick={onRegister}
              style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#8a5200", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              それでも新規登録する
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onReset} style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>やり直す</button>
        <button onClick={onRegister} disabled={registering || checkingDuplicate}
          style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: (registering || checkingDuplicate) ? "#888" : "#234f35", color: "#fff", border: "none", cursor: (registering || checkingDuplicate) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {checkingDuplicate ? "重複チェック中..." : registering ? "登録中..." : "この内容で登録する"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TextParseResult type
// ============================================================

interface TextParseResult {
  success: boolean;
  source_type: string;
  source_url: string;
  extracted: Record<string, unknown>;
  confidence: Record<string, Confidence>;
  needs_review: string[];
  low_confidence_fields: string[];
}

// ============================================================
// Main page
// ============================================================

interface Store { id: string; name: string }
interface Staff { id: string; name: string }

function ImportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialTab = searchParams.get("tab") === "scrape" ? "scrape" : searchParams.get("tab") === "url" ? "url" : "pdf";
  const [tab, setTab] = useState<"pdf" | "url" | "scrape">(initialTab);

  // ── Agent/Store selection ──
  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [autoSelected, setAutoSelected] = useState(false);
  const [propertyNumberPreview, setPropertyNumberPreview] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const agentReady = !!(selectedStore && selectedAgent);

  // セッションから店舗を自動選択
  const sessionStoreId = session?.user?.storeId;
  const sessionStaffId = session?.user?.staffId;

  // 店舗一覧を取得（初回のみ）
  useEffect(() => {
    fetch("/api/stores")
      .then(r => r.json())
      .then(d => setStores(d.stores ?? []))
      .catch(() => {})
      .finally(() => setLoadingStores(false));
  }, []);

  // セッションの店舗を自動選択（stores取得完了 & セッション取得完了後）
  useEffect(() => {
    if (stores.length > 0 && sessionStoreId && !selectedStore) {
      setSelectedStore(sessionStoreId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, sessionStoreId]);

  // 選択店舗が変わったらスタッフ一覧を取得
  useEffect(() => {
    if (!selectedStore) { setStaffList([]); setSelectedAgent(""); setAutoSelected(false); return; }
    setLoadingStaff(true);
    fetch(`/api/staff?store_id=${selectedStore}`)
      .then(r => r.json())
      .then(d => setStaffList(d.staff ?? []))
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, [selectedStore]);

  // セッションの担当者を自動選択（staffList取得完了 & セッション取得完了後）
  useEffect(() => {
    if (staffList.length > 0 && sessionStaffId && !selectedAgent) {
      const found = staffList.find(s => s.id === sessionStaffId);
      if (found) {
        setSelectedAgent(sessionStaffId);
        setAutoSelected(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList, sessionStaffId]);

  useEffect(() => {
    if (!selectedStore) { setPropertyNumberPreview(null); return; }
    fetch(`/api/property-number/preview?store_id=${selectedStore}`)
      .then(r => r.json())
      .then(d => setPropertyNumberPreview(d.preview ?? null))
      .catch(() => {});
  }, [selectedStore]);

  // ── PDF state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [pdfResult, setPdfResult] = useState<ParseResult | null>(null);

  // ── Scrape (URL auto-fetch) state ──
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapeResult, setScrapeResult] = useState<TextParseResult | null>(null);

  // ── URL/Text state ──
  const [pastedText, setPastedText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("SUUMO");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [textResult, setTextResult] = useState<TextParseResult | null>(null);

  // ── Shared form/register state ──
  const [form, setForm] = useState<Record<string, string>>({});
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // ── Duplicate check state ──
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // ── Multi-unit state ──
  const [multiUnitMode, setMultiUnitMode] = useState<"single" | "separate">("separate");

  // ── File handlers ──
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) {
      setParseError("PDF・JPG・PNG形式のみ対応しています");
      return;
    }
    setSelectedFile(file);
    setParseError("");
    setPdfResult(null);
    setForm({});
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── PDF parse ──
  const handleParse = async () => {
    if (!selectedFile) return;
    setParsing(true);
    setParseError("");
    setPdfResult(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/documents/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error ?? "解析に失敗しました"); return; }
      setPdfResult(data as ParseResult);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.extracted ?? {})) {
        initial[k] = v !== null && v !== undefined ? String(v) : "";
      }
      setForm(initial);
    } catch { setParseError("通信エラーが発生しました"); }
    finally { setParsing(false); }
  };

  // ── Text extract ──
  const handleExtract = async () => {
    if (pastedText.trim().length < 50) { setExtractError("テキストが短すぎます"); return; }
    setExtracting(true);
    setExtractError("");
    setTextResult(null);
    try {
      const res = await fetch("/api/documents/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText, source_url: sourceUrl, source_type: sourceType }),
      });
      const data = await res.json();
      if (!res.ok) { setExtractError(data.error ?? "解析に失敗しました"); return; }
      setTextResult(data as TextParseResult);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.extracted ?? {})) {
        initial[k] = v !== null && v !== undefined ? String(v) : "";
      }
      setForm(initial);
    } catch { setExtractError("通信エラーが発生しました"); }
    finally { setExtracting(false); }
  };

  // ── Build payload ──
  const buildPayload = () => {
    const payload: Record<string, unknown> = { prefecture: "東京都" };
    if (selectedStore) payload.store_id = selectedStore;
    if (selectedAgent) payload.agent_id = selectedAgent;
    for (const field of [...FIELDS, ...SELLER_FIELDS]) {
      const val = form[field.key];
      if (!val) continue;
      payload[field.key] = field.type === "number" ? Number(val) : val;
    }
    if (form.ad_transfer_consent) payload.ad_transfer_consent = form.ad_transfer_consent;
    return payload;
  };

  // ── Register (with duplicate check) ──
  const handleRegister = async () => {
    const required = ["property_type", "price", "city"];
    for (const f of required) {
      if (!form[f]) { setRegisterError(`必須項目「${FIELDS.find(x => x.key === f)?.label ?? f}」を入力してください`); return; }
    }
    setRegisterError("");

    // 重複チェック（まだ警告を承認していない場合）
    if (!showDuplicateWarning) {
      setCheckingDuplicate(true);
      try {
        const dupRes = await fetch("/api/properties/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reins_number: form.reins_number,
            city: form.city,
            town: form.town,
            address: form.address,
            price: form.price ? Number(form.price) : undefined,
            area_land_m2: form.area_land_m2 ? Number(form.area_land_m2) : undefined,
            area_build_m2: form.area_build_m2 ? Number(form.area_build_m2) : undefined,
            area_exclusive_m2: form.area_exclusive_m2 ? Number(form.area_exclusive_m2) : undefined,
            station_name1: form.station_name1,
            station_walk1: form.station_walk1 ? Number(form.station_walk1) : undefined,
          }),
        });
        const dupData = await dupRes.json();
        if (dupData.isDuplicate && dupData.matches?.length > 0) {
          setDuplicates(dupData.matches);
          setShowDuplicateWarning(true);
          setCheckingDuplicate(false);
          return; // 警告を表示して処理を中断
        }
      } catch { /* 重複チェック失敗は無視して登録続行 */ }
      setCheckingDuplicate(false);
    }

    // 登録実行
    setRegistering(true);
    try {
      const src = pdfResult ?? scrapeResult;
      const multiUnit = src && "multi_unit" in src ? (src as ParseResult).multi_unit : undefined;

      // 多棟を棟ごとに別々登録
      if (multiUnit?.detected && multiUnitMode === "separate" && multiUnit.units.length > 1) {
        const basePayload = buildPayload();
        const ids: string[] = [];
        for (const unit of multiUnit.units) {
          const unitPayload = {
            ...basePayload,
            title: `${form.city ?? ""}${form.town ?? ""} ${unit.name}`,
            price: unit.price ?? basePayload.price,
            area_land_m2: unit.area_land_m2 ?? basePayload.area_land_m2,
            area_build_m2: unit.area_build_m2 ?? basePayload.area_build_m2,
            area_exclusive_m2: unit.area_exclusive_m2 ?? basePayload.area_exclusive_m2,
            rooms: unit.rooms ?? basePayload.rooms,
          };
          const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(unitPayload) });
          const data = await res.json();
          if (!res.ok) { setRegisterError(`${unit.name}の登録に失敗: ${data.error ?? "エラー"}`); return; }
          ids.push(data.property.id);
        }
        // 最初の物件に遷移
        router.push(`/admin/properties/${ids[0]}`);
      } else {
        // 通常の1物件登録
        const payload = buildPayload();
        const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { setRegisterError(data.error ?? "登録に失敗しました"); return; }
        const propertyId: string = data.property.id;
        router.push(`/admin/properties/${propertyId}`);
      }
    } catch { setRegisterError("通信エラーが発生しました"); }
    finally { setRegistering(false); setShowDuplicateWarning(false); setDuplicates([]); }
  };

  // ── Scrape ──
  const handleScrape = async () => {
    if (!scrapeUrl.startsWith("http")) { setScrapeError("有効なURLを入力してください"); return; }
    setScraping(true);
    setScrapeError("");
    setScrapeResult(null);
    try {
      const res = await fetch("/api/documents/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setScrapeError(data.error ?? "取得に失敗しました"); return; }
      setScrapeResult(data as TextParseResult);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.extracted ?? {})) {
        initial[k] = v !== null && v !== undefined ? String(v) : "";
      }
      setForm(initial);
    } catch { setScrapeError("通信エラーが発生しました"); }
    finally { setScraping(false); }
  };

  const resetPdf = () => { setSelectedFile(null); setPdfResult(null); setForm({}); setParseError(""); };
  const resetText = () => { setPastedText(""); setSourceUrl(""); setTextResult(null); setForm({}); setExtractError(""); };
  const resetScrape = () => { setScrapeUrl(""); setScrapeResult(null); setForm({}); setScrapeError(""); };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>← 物件一覧</button>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件情報を取込</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>販売図面PDF・ポータルサイトのテキストから物件情報をAIで自動抽出します</p>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left column: Store/Agent selection ── */}
        <div style={{ background: "#f9f8f6", borderRadius: 12, border: "1px solid #e0deda", padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>担当者・店舗</h2>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 6, letterSpacing: ".04em" }}>
              店舗 <span style={{ color: "#8c1f1f" }}>*</span>
            </label>
            {loadingStores ? (
              <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
            ) : (
              <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                <option value="">店舗を選択</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 6, letterSpacing: ".04em" }}>
              担当者 <span style={{ color: "#8c1f1f" }}>*</span>
            </label>
            {loadingStaff ? (
              <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
            ) : (
              <select value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setAutoSelected(false); }}
                disabled={!selectedStore}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: selectedStore ? "#fff" : "#f7f6f2", color: selectedStore ? "#1c1b18" : "#888" }}>
                <option value="">担当者を選択</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {selectedStore && staffList.length === 0 && !loadingStaff && (
              <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>この店舗にはスタッフが登録されていません。</p>
            )}
          </div>

          {propertyNumberPreview && (
            <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#706e68" }}>
              物件番号（予定）: <strong style={{ color: "#1c1b18", fontSize: 13 }}>{propertyNumberPreview}</strong>
            </div>
          )}

          {autoSelected && (
            <p style={{ fontSize: 11, color: "#4a8c5c", marginBottom: 0, lineHeight: 1.5 }}>
              ログイン中のスタッフが自動選択されています。別の担当者で登録する場合は変更してください。
            </p>
          )}
          {!selectedAgent && (
            <p style={{ fontSize: 11, color: "#888", marginBottom: 0 }}>※ 担当者を選択しないと取込できません</p>
          )}
        </div>

        {/* ── Right column: Import tabs ── */}
        <div style={{ position: "relative" }}>
          {/* Disabled overlay when agent not ready */}
          {!agentReady && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "rgba(255,255,255,0.6)", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "all",
            }}>
              <div style={{ background: "#fff", border: "1px solid #e0deda", borderRadius: 10, padding: "16px 28px", fontSize: 13, color: "#706e68", fontWeight: 500, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                ← 先に店舗・担当者を選択してください
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e0deda" }}>
            {([["pdf", "📄 PDFから取込"], ["url", "📋 テキストから取込"], ["scrape", "🔗 URLから自動取得"]] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "10px 24px", fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#8c1f1f" : "#706e68", background: "none", border: "none", borderBottom: tab === t ? "2px solid #8c1f1f" : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── PDF Tab ── */}
          {tab === "pdf" && (
            <>
              {!pdfResult ? (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${dragging ? "#234f35" : "#c8c6c0"}`, borderRadius: 10, padding: "36px 24px", textAlign: "center", background: dragging ? "#f0f7f3" : "#fafaf8", cursor: selectedFile ? "default" : "pointer", transition: "all .15s" }}>
                    {selectedFile ? (
                      <div>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{selectedFile.name}</div>
                        <div style={{ fontSize: 11, color: "#706e68", marginBottom: 12 }}>{(selectedFile.size / 1024).toFixed(0)} KB</div>
                        <button onClick={e => { e.stopPropagation(); resetPdf(); }} style={{ fontSize: 11, color: "#8c1f1f", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>ファイルを変更</button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>☁</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#1c1b18", marginBottom: 6 }}>ここにファイルをドラッグ&ドロップ</div>
                        <div style={{ fontSize: 12, color: "#706e68", marginBottom: 14 }}>または</div>
                        <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>ファイルを選択</button>
                        <div style={{ fontSize: 11, color: "#706e68", marginTop: 10 }}>PDF・JPG・PNG（最大20MB）</div>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                  {parseError && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "8px 14px", borderRadius: 8, marginTop: 12, fontSize: 13 }}>{parseError}</div>}
                  {selectedFile && (
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                      <button onClick={handleParse} disabled={parsing} style={{ padding: "10px 32px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: parsing ? "#888" : "#234f35", color: "#fff", border: "none", cursor: parsing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                        {parsing ? "AI解析中..." : "解析開始"}
                      </button>
                      {parsing && <p style={{ fontSize: 12, color: "#706e68", marginTop: 8 }}>AIが物件情報を読み取っています...</p>}
                    </div>
                  )}
                </div>
              ) : (
                <ResultForm
                  result={pdfResult}
                  form={form} setForm={setForm}
                  generated={pdfResult.generated}
                  registering={registering} registerError={registerError}
                  checkingDuplicate={checkingDuplicate} showDuplicateWarning={showDuplicateWarning} duplicates={duplicates}
                  multiUnit={pdfResult.multi_unit} multiUnitMode={multiUnitMode} onMultiUnitModeChange={setMultiUnitMode}
                  onRegister={handleRegister}
                  onDismissDuplicate={() => { setShowDuplicateWarning(false); setDuplicates([]); }}
                  onReset={resetPdf}
                />
              )}
            </>
          )}

          {/* ── Scrape Tab ── */}
          {tab === "scrape" && (
            <>
              {!scrapeResult ? (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
                  <div style={{ background: "#f8f6f3", borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: "#3a2a1a" }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>対応サイト</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ background: "#e6f4ea", color: "#234f35", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>✓ 対応</span>
                      <span>ハトサポシステム使用サイト（東宝ハウス各社・多数の不動産会社）</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#706e68", marginTop: 8 }}>
                      URL例: https://www.toho-setagaya.co.jp/realestate/detail.php?k_number=...
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a" }}>物件詳細ページのURLを入力してください</label>
                    <input
                      type="url"
                      value={scrapeUrl}
                      onChange={e => setScrapeUrl(e.target.value)}
                      placeholder="https://www.toho-setagaya.co.jp/realestate/detail.php?k_number=H001..."
                      style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                      onKeyDown={e => { if (e.key === "Enter") handleScrape(); }}
                    />
                  </div>

                  {scrapeError && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{scrapeError}</div>}

                  <div style={{ textAlign: "center" }}>
                    <button onClick={handleScrape} disabled={scraping || !scrapeUrl.startsWith("http")}
                      style={{ padding: "10px 36px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: scraping ? "#888" : "#8c1f1f", color: "#fff", border: "none", cursor: (scraping || !scrapeUrl.startsWith("http")) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: !scrapeUrl.startsWith("http") ? 0.6 : 1 }}>
                      {scraping ? "取得中..." : "物件情報を取得する"}
                    </button>
                    {scraping && <p style={{ fontSize: 12, color: "#706e68", marginTop: 8 }}>物件ページから情報を取得しています...</p>}
                  </div>
                </div>
              ) : (
                <ResultForm
                  result={scrapeResult}
                  form={form} setForm={setForm}
                  generated={undefined}
                  registering={registering} registerError={registerError}
                  checkingDuplicate={checkingDuplicate} showDuplicateWarning={showDuplicateWarning} duplicates={duplicates}
                  multiUnit={undefined} multiUnitMode={multiUnitMode} onMultiUnitModeChange={setMultiUnitMode}
                  onRegister={handleRegister}
                  onDismissDuplicate={() => { setShowDuplicateWarning(false); setDuplicates([]); }}
                  onReset={resetScrape}
                />
              )}
            </>
          )}

          {/* ── URL Text Tab ── */}
          {tab === "url" && (
            <>
              {!textResult ? (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 20 }}>
                  {/* Instructions */}
                  <div style={{ background: "#f8f6f3", borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: "#3a2a1a" }}>
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>取込手順</div>
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                      <li>不動産ポータルサイト（SUUMO・athome等）の物件詳細ページを開く</li>
                      <li>ページ上で <kbd style={{ background: "#fff", border: "1px solid #ccc", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>Ctrl+A</kbd> → <kbd style={{ background: "#fff", border: "1px solid #ccc", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>Ctrl+C</kbd> でページ全体をコピー</li>
                      <li>下のテキストエリアに貼り付ける</li>
                    </ol>
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 7, fontSize: 12, color: "#664d03" }}>
                      ⚠️ ページのテキストを手動でコピーしたものをAIで整理・構造化します。サーバーからの自動取得（スクレイピング）は行いません。
                    </div>
                  </div>

                  {/* Textarea */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a" }}>
                      コピーしたページテキストを貼り付け <span style={{ color: "#8c1f1f" }}>*</span>
                    </label>
                    <textarea
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      placeholder="ここにページのテキストを貼り付けてください...&#10;（Ctrl+A で全選択後 Ctrl+C でコピーしたもの）"
                      rows={10}
                      style={{ border: "1px solid #e0deda", borderRadius: 8, padding: "12px 14px", fontSize: 13, fontFamily: "inherit", resize: "vertical", width: "100%", boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: 11, color: "#888" }}>{pastedText.length.toLocaleString()} 文字</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a" }}>参照元URL（任意）</label>
                      <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://suumo.jp/..." style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px", fontSize: 13, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a" }}>情報源の種別</label>
                      <select value={sourceType} onChange={e => setSourceType(e.target.value)} style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px", fontSize: 13, fontFamily: "inherit" }}>
                        {SOURCE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  {extractError && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{extractError}</div>}

                  <div style={{ textAlign: "center" }}>
                    <button onClick={handleExtract} disabled={extracting || pastedText.trim().length < 50}
                      style={{ padding: "10px 36px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: extracting ? "#888" : "#8c1f1f", color: "#fff", border: "none", cursor: (extracting || pastedText.trim().length < 50) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pastedText.trim().length < 50 ? 0.6 : 1 }}>
                      {extracting ? "AIで解析中..." : "AIで物件情報を抽出する"}
                    </button>
                    {extracting && <p style={{ fontSize: 12, color: "#706e68", marginTop: 8 }}>AIがテキストから物件情報を読み取っています...</p>}
                  </div>
                </div>
              ) : (
                <ResultForm
                  result={textResult}
                  form={form} setForm={setForm}
                  generated={undefined}
                  registering={registering} registerError={registerError}
                  checkingDuplicate={checkingDuplicate} showDuplicateWarning={showDuplicateWarning} duplicates={duplicates}
                  multiUnit={undefined} multiUnitMode={multiUnitMode} onMultiUnitModeChange={setMultiUnitMode}
                  onRegister={handleRegister}
                  onDismissDuplicate={() => { setShowDuplicateWarning(false); setDuplicates([]); }}
                  onReset={resetText}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#aaa" }}>読み込み中...</div>}>
      <ImportPageInner />
    </Suspense>
  );
}
