"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PropertyFormTabs, INITIAL_FORM, formToBody,
} from "@/components/admin/property-form-tabs";

interface Store { id: string; name: string }
interface StaffItem {
  id: string;
  full_name: string;
  name: string;
  role: string;
  staff_code: string | null;
  position: string | null;
}

// ── Agent selector (shared between PDF and manual modes) ─────────────────────

interface AgentSelectorProps {
  stores: Store[];
  staffList: StaffItem[];
  selectedStore: string;
  setSelectedStore: (v: string) => void;
  selectedAgent: string;
  setSelectedAgent: (v: string) => void;
  previewNumber: string | null;
  previewLoading: boolean;
  selectedStaffCode: string | null;
  loadingStores: boolean;
  loadingStaff: boolean;
}

function AgentSelector({
  stores, staffList, selectedStore, setSelectedStore,
  selectedAgent, setSelectedAgent, previewNumber, previewLoading,
  selectedStaffCode, loadingStores, loadingStaff,
}: AgentSelectorProps) {
  const selectedStaffItem = staffList.find(s => s.id === selectedAgent);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#706e68", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 12 }}>
        担当者・店舗
      </div>

      {/* Store */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 5 }}>
          店舗 <span style={{ color: "#8c1f1f" }}>*</span>
        </label>
        {loadingStores ? (
          <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
        ) : (
          <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
            <option value="">店舗を選択してください</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Agent */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 5 }}>
          担当者 <span style={{ color: "#8c1f1f" }}>*</span>
        </label>
        {loadingStaff ? (
          <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
        ) : (
          <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
            disabled={!selectedStore}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: selectedStore ? "#fff" : "#f7f6f2", color: selectedStore ? "#1c1b18" : "#888" }}>
            <option value="">担当者を選択してください</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.full_name}
                {s.position ? `（${s.position}）` : ""}
                {s.staff_code ? ` — ${s.staff_code}` : " — コード未設定"}
              </option>
            ))}
          </select>
        )}
        {selectedStore && staffList.length === 0 && !loadingStaff && (
          <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>この店舗にはスタッフが登録されていません。</p>
        )}
      </div>

      {/* Property number preview */}
      {selectedAgent && (
        <div style={{ borderRadius: 8, border: "1px solid #e0deda", overflow: "hidden" }}>
          <div style={{ background: "#f7f6f2", padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: ".05em" }}>
            この物件の番号（自動採番）
          </div>
          <div style={{ padding: "10px 12px" }}>
            {previewLoading ? (
              <div style={{ fontSize: 12, color: "#aaa" }}>採番中...</div>
            ) : !selectedStaffCode ? (
              <div style={{ fontSize: 12, color: "#e65100" }}>
                ⚠️ {selectedStaffItem?.name ?? "この担当者"}のスタッフコードが未設定です。
                <a href="/admin/staff" style={{ marginLeft: 5, color: "#234f35", fontSize: 11, textDecoration: "underline" }}>設定する →</a>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#1a3a2a", marginBottom: 2 }}>
                  {previewNumber ?? "—"}
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>
                  コード: <strong style={{ color: "#706e68" }}>{selectedStaffCode}</strong> — 登録確定時に発行
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function NewPropertyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"pdf" | "manual">(
    searchParams.get("mode") === "manual" ? "manual" : "pdf"
  );

  // Manual form state
  const [step, setStep] = useState<"agent" | "form">("agent");
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Shared agent state
  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedStaffCode, setSelectedStaffCode] = useState<string | null>(null);

  const loading = saving;

  useEffect(() => {
    fetch("/api/stores")
      .then(r => r.json())
      .then(d => setStores(d.stores ?? []))
      .catch(() => {})
      .finally(() => setLoadingStores(false));
  }, []);

  useEffect(() => {
    if (!selectedStore) { setStaffList([]); setSelectedAgent(""); return; }
    setLoadingStaff(true);
    fetch(`/api/staff?store_id=${selectedStore}&active=true`)
      .then(r => r.json())
      .then(d => setStaffList(d.staff ?? []))
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedAgent) { setPreviewNumber(null); setSelectedStaffCode(null); return; }
    const found = staffList.find(s => s.id === selectedAgent);
    if (!found?.staff_code) { setSelectedStaffCode(null); setPreviewNumber(null); return; }
    setSelectedStaffCode(found.staff_code);
    setPreviewLoading(true);
    fetch(`/api/staff/${selectedAgent}/preview-property-number`)
      .then(r => r.json())
      .then(d => setPreviewNumber(d.preview ?? null))
      .catch(() => setPreviewNumber(null))
      .finally(() => setPreviewLoading(false));
  }, [selectedAgent, staffList]);

  // ── PDF handlers ──
  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  };

  const handlePdfSubmit = async () => {
    if (!pdfFile || !selectedAgent) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("staff_id", selectedAgent);
      if (selectedStore) formData.append("store_id", selectedStore);

      const res = await fetch("/api/documents/scrape-url", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json() as { property?: { id: string } };
        router.push(`/admin/properties/${data.property?.id ?? ""}`);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "PDFの解析に失敗しました");
        setMode("manual");
      }
    } catch {
      setError("PDFの解析に失敗しました。手動で入力してください。");
      setMode("manual");
    } finally {
      setSaving(false);
    }
  };

  // ── Manual handlers ──
  const handleAgentNext = () => {
    if (!selectedStore) { setError("店舗を選択してください"); return; }
    if (!selectedAgent) { setError("担当者を選択してください"); return; }
    setError("");
    setForm(f => ({ ...f, store_id: selectedStore, agent_id: selectedAgent }));
    setStep("form");
  };

  const handleSave = async () => {
    if (!form.price || !form.city) { setError("価格と市区町村は必須です"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        ...formToBody(form),
        store_id: selectedStore || undefined,
        agent_id: selectedAgent || undefined,
      };
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました"); return; }
      router.push(`/admin/properties/${data.property.id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const selectedStaffItem = staffList.find(s => s.id === selectedAgent);

  return (
    <div style={{ padding: 28, maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => mode === "manual" && step === "form" ? setStep("agent") : router.back()}
          style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginBottom: 8 }}>
          ← {mode === "manual" && step === "form" ? "担当者選択に戻る" : "物件一覧"}
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 500 }}>物件新規登録</h1>
      </div>

      {/* Mode tabs */}
      <div style={{
        display: "inline-flex", background: "#f2f1ed", borderRadius: 10,
        padding: 4, gap: 2, marginBottom: 24,
      }}>
        {([
          { key: "pdf" as const, label: "📄 PDFから取込（推奨）" },
          { key: "manual" as const, label: "✏️ 手動で入力" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => { setMode(key); setStep("agent"); setError(""); }}
            style={{
              padding: "8px 20px", borderRadius: 7, fontSize: 12,
              fontWeight: mode === key ? 700 : 400,
              background: mode === key ? "#fff" : "transparent",
              color: mode === key ? "#1a3a2a" : "#888",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              transition: "all .15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PDF MODE ── */}
      {mode === "pdf" && (
        <div>
          {/* Info banner */}
          <div style={{ background: "#e8f4fd", border: "1px solid #b3d9f5", borderRadius: 10, padding: "11px 14px", marginBottom: 20, fontSize: 12, color: "#1565c0", lineHeight: 1.6 }}>
            💡 販売資料（PDF）をアップロードすると、物件情報を自動で読み取ります。確認・修正してから登録できます。
          </div>

          {/* Agent selector */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 16 }}>
            <AgentSelector
              stores={stores} staffList={staffList}
              selectedStore={selectedStore} setSelectedStore={setSelectedStore}
              selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
              previewNumber={previewNumber} previewLoading={previewLoading}
              selectedStaffCode={selectedStaffCode}
              loadingStores={loadingStores} loadingStaff={loadingStaff}
            />
          </div>

          {/* PDF drop zone */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20 }}>
            <div
              onDrop={handlePdfDrop}
              onDragOver={e => { e.preventDefault(); setPdfDragging(true); }}
              onDragLeave={() => setPdfDragging(false)}
              onClick={() => pdfInputRef.current?.click()}
              style={{
                border: `2px dashed ${pdfDragging ? "#234f35" : "#c8c6c0"}`,
                borderRadius: 12, padding: "40px 20px", textAlign: "center",
                cursor: "pointer", background: pdfDragging ? "#f0f7f3" : "#fafaf8",
                transition: "all .15s",
              }}
            >
              <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }} />
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: pdfDragging ? "#234f35" : "#5a4a3a", marginBottom: 6 }}>
                {pdfDragging ? "ここにドロップ" : "PDFをここにドロップ または クリックして選択"}
              </div>
              <div style={{ fontSize: 12, color: "#aaa" }}>
                販売図面・物件概要書などのPDFファイルに対応
              </div>
            </div>

            {/* Selected PDF + submit */}
            {pdfFile && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 9, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>{pdfFile.name}</div>
                    <div style={{ fontSize: 11, color: "#66bb6a" }}>
                      {(pdfFile.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa" }}>×</button>
                </div>

                {previewNumber && (
                  <div style={{ background: "#faf6ee", border: "1px solid #e8d9b8", borderRadius: 9, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#c9a96e", fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>物件番号（自動採番）</div>
                    <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#1a3a2a" }}>{previewNumber}</div>
                  </div>
                )}

                {error && (
                  <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#c62828", marginBottom: 12 }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handlePdfSubmit}
                  disabled={loading || !selectedAgent}
                  style={{
                    width: "100%", padding: "13px 20px", borderRadius: 9,
                    fontSize: 14, fontWeight: 700,
                    background: loading || !selectedAgent ? "#aaa" : "#c9a96e",
                    color: "#fff", border: "none",
                    cursor: loading || !selectedAgent ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {loading ? "解析中..." : !selectedAgent ? "担当者を先に選択してください" : "📄 PDFから物件を登録する"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {mode === "manual" && (
        <>
          {/* Agent step */}
          {step === "agent" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e0deda", padding: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>担当者・店舗を選択</h2>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
                担当者のスタッフコードをもとに物件番号が自動採番されます。
              </p>

              <AgentSelector
                stores={stores} staffList={staffList}
                selectedStore={selectedStore} setSelectedStore={setSelectedStore}
                selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
                previewNumber={previewNumber} previewLoading={previewLoading}
                selectedStaffCode={selectedStaffCode}
                loadingStores={loadingStores} loadingStaff={loadingStaff}
              />

              {error && <p style={{ fontSize: 12, color: "#8c1f1f", marginBottom: 12 }}>{error}</p>}

              <button onClick={handleAgentNext}
                style={{ width: "100%", padding: "11px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                次へ：物件情報を入力 →
              </button>

              {!selectedStaffCode && selectedAgent && (
                <div style={{ marginTop: 12, background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#8a5200" }}>
                  💡 スタッフコードは
                  <a href="/admin/staff" style={{ color: "#234f35", margin: "0 4px", fontWeight: 600 }}>スタッフ管理</a>
                  から一括生成できます。
                </div>
              )}
            </div>
          )}

          {/* Form step */}
          {step === "form" && (
            <>
              <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "8px 16px", marginBottom: 14, fontSize: 12, color: "#1b5e20", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <span>🏪 <strong>{stores.find(s => s.id === selectedStore)?.name ?? "—"}</strong></span>
                <span>👤 <strong>{selectedStaffItem?.name ?? selectedStaffItem?.full_name ?? "—"}</strong></span>
                {previewNumber && (
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#234f35" }}>
                    📋 {previewNumber}
                  </span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  {error && <span style={{ fontSize: 12, color: "#8c1f1f" }}>{error}</span>}
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {saving ? "登録中..." : "✅ 登録する"}
                  </button>
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
                <PropertyFormTabs tab={tab} setTab={setTab} form={form} setForm={setForm} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 28, color: "#aaa" }}>読み込み中...</div>}>
      <NewPropertyPageInner />
    </Suspense>
  );
}
