"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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


export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState<"agent" | "form">("agent");
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Store / agent
  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Property number preview
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedStaffCode, setSelectedStaffCode] = useState<string | null>(null);

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

  const handleAgentNext = () => {
    if (!selectedStore) { setError("店舗を選択してください"); return; }
    if (!selectedAgent) { setError("担当者を選択してください"); return; }
    setError("");
    setForm(f => ({ ...f, store_id: selectedStore, agent_id: selectedAgent }));
    setStep("form");
  };

  const handleSave = async () => {
    if (!form.price || !form.city) {
      setError("価格と市区町村は必須です");
      return;
    }
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
    <div style={{ padding: 28 }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#f7f6f2", borderBottom: "1px solid #e0deda",
        marginBottom: 20, paddingBottom: 14, paddingTop: 4,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <button onClick={() => step === "form" ? setStep("agent") : router.back()}
            style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ← {step === "form" ? "担当者選択に戻る" : "物件一覧"}
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>物件新規登録</h1>
        </div>
        {step === "form" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {error && <span style={{ fontSize: 12, color: "#8c1f1f" }}>{error}</span>}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "登録中..." : "✅ 登録する"}
            </button>
          </div>
        )}
      </div>

      {/* STEP 1: Agent/Store selection */}
      {step === "agent" && (
        <div style={{ maxWidth: 520 }}>

          {/* Step indicator */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
            {[
              { n: 1, label: "担当者選択", active: true },
              { n: 2, label: "物件情報入力", active: false },
              { n: 3, label: "登録完了 → 広告確認へ", active: false },
            ].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
                    background: s.active ? "#234f35" : "#e0deda",
                    color: s.active ? "#fff" : "#aaa",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: s.active ? "#234f35" : "#aaa", fontWeight: s.active ? 700 : 400, whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 1, background: "#e0deda", margin: "0 8px", marginBottom: 18 }} />
                )}
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e0deda", padding: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>担当者・店舗を選択</h2>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 22, lineHeight: 1.6 }}>
              担当者のスタッフコードをもとに物件番号が自動採番されます。<br />
              上司・課長名で登録する場合も選択できます。
            </p>

            {/* Store */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 7, letterSpacing: ".04em" }}>
                店舗 <span style={{ color: "#8c1f1f" }}>*</span>
              </label>
              {loadingStores ? (
                <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
              ) : (
                <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                  <option value="">店舗を選択してください</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            {/* Agent */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 7, letterSpacing: ".04em" }}>
                担当者 <span style={{ color: "#8c1f1f" }}>*</span>
              </label>
              {loadingStaff ? (
                <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
              ) : (
                <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                  disabled={!selectedStore}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: selectedStore ? "#fff" : "#f7f6f2", color: selectedStore ? "#1c1b18" : "#888" }}>
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
              <div style={{
                borderRadius: 10,
                border: "1px solid #e0deda",
                overflow: "hidden",
                marginBottom: 22,
              }}>
                <div style={{ background: "#f7f6f2", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#706e68", letterSpacing: ".05em" }}>
                  この物件の番号（自動採番）
                </div>
                <div style={{ padding: "12px 14px" }}>
                  {previewLoading ? (
                    <div style={{ fontSize: 12, color: "#aaa" }}>採番中...</div>
                  ) : !selectedStaffCode ? (
                    <div style={{ fontSize: 12, color: "#e65100" }}>
                      ⚠️ {selectedStaffItem?.name ?? "この担当者"}のスタッフコードが未設定です。
                      <a href="/admin/staff" style={{ marginLeft: 6, color: "#234f35", fontSize: 11, textDecoration: "underline" }}>スタッフ管理でコードを設定 →</a>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#1a3a2a", marginBottom: 4 }}>
                        {previewNumber ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>
                        コード: <strong style={{ color: "#706e68" }}>{selectedStaffCode}</strong> — 登録確定時に発行
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: "#8c1f1f", marginBottom: 12 }}>{error}</p>}

            <button onClick={handleAgentNext}
              style={{ width: "100%", padding: "11px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              次へ：物件情報を入力 →
            </button>

            {/* Notice about staff code */}
            {!selectedStaffCode && selectedAgent && (
              <div style={{ marginTop: 12, background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#8a5200" }}>
                💡 スタッフコードは
                <a href="/admin/staff" style={{ color: "#234f35", margin: "0 4px", fontWeight: 600 }}>スタッフ管理</a>
                から一括生成できます。コードがない場合でも登録は続行できますが物件番号が自動採番されません。
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Property form */}
      {step === "form" && (
        <>
          {/* Summary bar */}
          <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "8px 16px", marginBottom: 14, fontSize: 12, color: "#1b5e20", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span>🏪 <strong>{stores.find(s => s.id === selectedStore)?.name ?? "—"}</strong></span>
            <span>👤 <strong>{selectedStaffItem?.name ?? selectedStaffItem?.full_name ?? "—"}</strong></span>
            {previewNumber && (
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#234f35" }}>
                📋 物件番号: {previewNumber}
              </span>
            )}
          </div>
          {error && <p style={{ fontSize: 12, color: "#8c1f1f", marginBottom: 12 }}>{error}</p>}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
            <PropertyFormTabs tab={tab} setTab={setTab} form={form} setForm={setForm} />
          </div>
        </>
      )}
    </div>
  );
}
