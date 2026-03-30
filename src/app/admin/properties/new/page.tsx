"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, INITIAL_FORM, formToBody,
} from "@/components/admin/property-form-tabs";

interface Store { id: string; name: string }
interface Staff { id: string; full_name: string; role: string }

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState<"agent" | "form">("agent");
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Agent/store selection
  const [stores, setStores] = useState<Store[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [propertyNumberPreview, setPropertyNumberPreview] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);

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
    fetch(`/api/staff?store_id=${selectedStore}`)
      .then(r => r.json())
      .then(d => setStaffList(d.staff ?? []))
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedStore) { setPropertyNumberPreview(null); return; }
    fetch(`/api/property-number/preview?store_id=${selectedStore}`)
      .then(r => r.json())
      .then(d => setPropertyNumberPreview(d.preview ?? null))
      .catch(() => {});
  }, [selectedStore]);

  const handleAgentNext = () => {
    if (!selectedStore) { setError("店舗を選択してください"); return; }
    if (!selectedAgent) { setError("担当者を選択してください"); return; }
    setError("");
    // Inject into form
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
              {saving ? "登録中..." : "登録する"}
            </button>
          </div>
        )}
      </div>

      {/* STEP 1: Agent/Store selection */}
      {step === "agent" && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>STEP 1: 担当者・店舗を選択</h2>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 7, letterSpacing: ".04em" }}>
                店舗 <span style={{ color: "#8c1f1f" }}>*</span>
              </label>
              {loadingStores ? (
                <div style={{ fontSize: 12, color: "#888" }}>読み込み中...</div>
              ) : (
                <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                  <option value="">店舗を選択してください</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a4a3a", display: "block", marginBottom: 7, letterSpacing: ".04em" }}>
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
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              )}
              {selectedStore && staffList.length === 0 && !loadingStaff && (
                <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>この店舗にはスタッフが登録されていません。</p>
              )}
            </div>

            {propertyNumberPreview && (
              <div style={{ background: "#f7f6f2", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#706e68" }}>
                物件番号（予定）: <strong style={{ color: "#1c1b18", fontSize: 13 }}>{propertyNumberPreview}</strong>
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: "#8c1f1f", marginBottom: 12 }}>{error}</p>}

            <button onClick={handleAgentNext}
              style={{ width: "100%", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              次へ: 物件情報を入力 →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Property form */}
      {step === "form" && (
        <>
          {/* Agent summary */}
          <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: "#1b5e20", display: "flex", gap: 12 }}>
            <span>店舗: <strong>{stores.find(s => s.id === selectedStore)?.name ?? "—"}</strong></span>
            <span>担当: <strong>{staffList.find(s => s.id === selectedAgent)?.full_name ?? "—"}</strong></span>
            {propertyNumberPreview && <span>物件番号: <strong>{propertyNumberPreview}</strong></span>}
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
