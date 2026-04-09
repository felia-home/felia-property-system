"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "顧客・書類選択" },
  { id: 2, label: "書類のAI解析" },
  { id: 3, label: "情報の確認・補足" },
  { id: 4, label: "ダウンロード" },
];

const DOC_TYPES = [
  { value: "前契約書",  label: "📋 前契約書",  desc: "現在の売主が買主だった時の売買契約書・重説" },
  { value: "役所資料",  label: "🏛️ 役所資料",  desc: "用途地域・建築計画概要書など" },
  { value: "登記簿",    label: "📑 登記簿謄本", desc: "土地・建物の登記事項証明書" },
  { value: "測量図",    label: "📐 測量図",     desc: "確定測量図・地積測量図" },
  { value: "その他",    label: "📎 その他",     desc: "その他参考書類" },
];

type UploadedDoc = {
  doc_type: string;
  file_name: string;
  file: File;
  analyzing: boolean;
  extracted: Record<string, unknown> | null;
};

type FormState = {
  seller_name: string; seller_name_kana: string; seller_address: string;
  seller_phone: string; seller_company: string;
  buyer_name: string; buyer_name_kana: string; buyer_address: string; buyer_phone: string;
  property_address: string; property_area_land: string; property_area_build: string;
  property_structure: string; property_built_year: string;
  price: string; price_land: string; price_building: string; price_tax: string; deposit: string;
  deposit_deadline: string; delivery_date: string; contract_date: string;
  zoning: string; building_coverage: string; floor_area_ratio: string;
  takken_staff_id: string; notes: string;
};

export default function ContractNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // STEP1
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string; tel?: string; address?: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [category, setCategory] = useState("一般仲介");
  const [propertyTypeDoc, setPropertyTypeDoc] = useState("土地建物");
  const [priceType, setPriceType] = useState("売買代金固定");

  // STEP2
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocType, setCurrentDocType] = useState("前契約書");

  // STEP3
  const [form, setForm] = useState<FormState>({
    seller_name: "", seller_name_kana: "", seller_address: "", seller_phone: "", seller_company: "",
    buyer_name: "", buyer_name_kana: "", buyer_address: "", buyer_phone: "",
    property_address: "", property_area_land: "", property_area_build: "",
    property_structure: "", property_built_year: "",
    price: "", price_land: "", price_building: "", price_tax: "", deposit: "",
    deposit_deadline: "", delivery_date: "",
    contract_date: new Date().toISOString().slice(0, 10),
    zoning: "", building_coverage: "", floor_area_ratio: "",
    takken_staff_id: "", notes: "",
  });
  const [staffList, setStaffList] = useState<{ id: string; name: string; takken_number?: string }[]>([]);
  const [contractId, setContractId] = useState<string | null>(null);

  const f = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // 顧客検索
  useEffect(() => {
    if (customerSearch.length < 1) return;
    const t = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`)
        .then((r) => r.json())
        .then((d) => setCustomers(d.customers ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // スタッフ一覧
  useEffect(() => {
    fetch("/api/staff?active=true")
      .then((r) => r.json())
      .then((d) => setStaffList(d.staff ?? []));
  }, []);

  const selectCustomer = (c: { id: string; name: string; tel?: string; address?: string }) => {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setCustomerSearch(c.name);
    setCustomers([]);
    setForm((p) => ({
      ...p,
      buyer_name: c.name ?? "",
      buyer_phone: c.tel ?? "",
      buyer_address: c.address ?? "",
    }));
  };

  // ファイルアップロード＆AI解析
  const handleFileUpload = async (file: File) => {
    const docEntry: UploadedDoc = {
      doc_type: currentDocType,
      file_name: file.name,
      file,
      analyzing: true,
      extracted: null,
    };
    setUploadedDocs((prev) => [...prev, docEntry]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", currentDocType);

    try {
      const res = await fetch("/api/contracts/analyze-doc", { method: "POST", body: formData });
      const data = await res.json();

      setUploadedDocs((prev) =>
        prev.map((d) =>
          d.file_name === file.name && d.doc_type === currentDocType
            ? { ...d, analyzing: false, extracted: data.extracted ?? null }
            : d
        )
      );

      if (data.extracted) {
        const ex = data.extracted as Record<string, unknown>;
        setForm((p) => ({
          ...p,
          property_address:    (ex.property_address    as string) || p.property_address,
          property_area_land:  ex.property_area_land   ? String(ex.property_area_land)   : p.property_area_land,
          property_area_build: ex.property_area_build  ? String(ex.property_area_build)  : p.property_area_build,
          property_structure:  (ex.property_structure  as string) || p.property_structure,
          property_built_year: ex.property_built_year  ? String(ex.property_built_year)  : p.property_built_year,
          seller_name:         (ex.seller_name         as string) || p.seller_name,
          seller_address:      (ex.seller_address      as string) || p.seller_address,
          price:               ex.price                ? String(ex.price)                : p.price,
          zoning:              (ex.zoning              as string) || p.zoning,
          building_coverage:   ex.building_coverage    ? String(ex.building_coverage)    : p.building_coverage,
          floor_area_ratio:    ex.floor_area_ratio     ? String(ex.floor_area_ratio)     : p.floor_area_ratio,
          notes:               ex.notes
            ? (p.notes ? p.notes + "\n" + (ex.notes as string) : ex.notes as string)
            : p.notes,
        }));
      }
    } catch {
      setUploadedDocs((prev) =>
        prev.map((d) =>
          d.file_name === file.name ? { ...d, analyzing: false } : d
        )
      );
    }
  };

  const needsPriceType = ["土地", "土地建物"].includes(propertyTypeDoc);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          contract_category: category,
          property_type_doc: propertyTypeDoc,
          price_type: priceType,
          ...form,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setContractId(data.contract.id);
        setStep(4);
      } else {
        alert("保存エラー: " + data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadUrl = (type: string) =>
    contractId ? `/api/contracts/${contractId}/download?type=${type}` : "#";

  // ===== RENDER =====
  return (
    <div style={{ padding: "24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: "#1c1b18" }}>
          契約書・重要事項説明書の作成
        </h1>
        <p style={{ fontSize: 13, color: "#706e68", marginTop: 4 }}>
          書類をアップロードするとAIが情報を自動抽出します
        </p>
      </div>

      {/* ステップバー */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, overflowX: "auto" }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold",
              background: step > s.id ? "#16a34a" : step === s.id ? "#1a3a2a" : "#e5e7eb",
              color: step >= s.id ? "#fff" : "#9ca3af",
              boxShadow: step === s.id ? "0 0 0 4px rgba(26,58,42,0.15)" : "none",
            }}>
              {step > s.id ? "✓" : s.id}
            </div>
            <span style={{ fontSize: 12, fontWeight: "bold", color: step === s.id ? "#1a3a2a" : "#9ca3af" }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ width: 24, height: 2, background: step > s.id ? "#16a34a" : "#e5e7eb", flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* ===== STEP 1 ===== */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 顧客検索 */}
          <Card title="①　買主（顧客）を選択">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="顧客名で検索..."
                style={inputStyle}
              />
              {customers.length > 0 && (
                <div style={{
                  position: "absolute", zIndex: 10, width: "100%", background: "#fff",
                  border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  marginTop: 4, maxHeight: 220, overflowY: "auto",
                }}>
                  {customers.map((c) => (
                    <button key={c.id} onClick={() => selectCustomer(c)} style={{
                      width: "100%", textAlign: "left", padding: "10px 16px",
                      background: "none", border: "none", borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                    }}>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        {c.tel} / {c.address}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                ✅ <strong style={{ color: "#166534" }}>{selectedCustomer.name}</strong> 様を選択済み
              </div>
            )}
          </Card>

          {/* 取引形態 */}
          <Card title="②　取引の形態">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { value: "一般仲介", label: "一般仲介用", desc: "売主・買主双方の仲介" },
                { value: "消費者契約", label: "消費者契約用", desc: "買主が消費者の場合" },
                { value: "売主宅建業者", label: "売主宅建業者用", desc: "売主が宅建業者" },
              ].map((opt) => (
                <SelectCard key={opt.value} selected={category === opt.value} onClick={() => setCategory(opt.value)}
                  label={opt.label} desc={opt.desc} />
              ))}
            </div>
          </Card>

          {/* 物件種別 */}
          <Card title="③　物件の種別">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { value: "土地", label: "🌿 土地" },
                { value: "土地建物", label: "🏡 土地建物（戸建て）" },
                { value: "区分所有_敷地権", label: "🏢 区分所有（敷地権あり）" },
                { value: "区分所有_非敷地権", label: "🏢 区分所有（敷地権なし）" },
                { value: "借地権付建物", label: "📋 借地権付建物" },
                ...(category === "売主宅建業者" ? [
                  { value: "土地建物_新築", label: "🏠 土地建物（新築）" },
                  { value: "借地権付建物_新築", label: "📋 借地権付建物（新築）" },
                ] : []),
              ].map((opt) => (
                <button key={opt.value} onClick={() => setPropertyTypeDoc(opt.value)} style={{
                  padding: "10px 14px", border: `2px solid ${propertyTypeDoc === opt.value ? "#1a3a2a" : "#e5e7eb"}`,
                  borderRadius: 10, textAlign: "left", fontSize: 13, fontWeight: "bold", cursor: "pointer",
                  background: propertyTypeDoc === opt.value ? "rgba(26,58,42,0.05)" : "#fff",
                  color: propertyTypeDoc === opt.value ? "#1a3a2a" : "#374151",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* 代金精算 */}
          {needsPriceType && (
            <Card title="④　売買代金の精算方法">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { value: "売買代金固定", label: "代金固定", desc: "面積精算なし" },
                  { value: "売買代金清算_測量", label: "清算（測量）", desc: "測量後に精算" },
                  { value: "売買代金清算_確定測量", label: "清算（確定測量）", desc: "確定測量後に精算" },
                ].map((opt) => (
                  <SelectCard key={opt.value} selected={priceType === opt.value} onClick={() => setPriceType(opt.value)}
                    label={opt.label} desc={opt.desc} />
                ))}
              </div>
            </Card>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!customerId}
            style={{ ...btnPrimary, opacity: customerId ? 1 : 0.4 }}
          >
            次へ：書類をアップロード →
          </button>
        </div>
      )}

      {/* ===== STEP 2 ===== */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1d4ed8" }}>
            💡 書類をアップロードすると、AIが物件情報・売主情報・法令制限などを自動抽出して次のフォームに入力します。
            書類がない場合はスキップして手動入力できます。
          </div>

          <Card title="アップロードする書類の種類">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {DOC_TYPES.map((dt) => (
                <button key={dt.value} onClick={() => setCurrentDocType(dt.value)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  border: `2px solid ${currentDocType === dt.value ? "#1a3a2a" : "#e5e7eb"}`,
                  borderRadius: 10, background: currentDocType === dt.value ? "rgba(26,58,42,0.05)" : "#fff",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 22 }}>{dt.label.split(" ")[0]}</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 13 }}>{dt.label.split(" ").slice(1).join(" ")}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{dt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2.5px dashed rgba(26,58,42,0.35)", borderRadius: 16, padding: "32px",
                textAlign: "center", cursor: "pointer",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              />
              <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: "bold", color: "#374151", marginBottom: 4 }}>PDFまたはWordをアップロード</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>クリックしてファイルを選択</div>
            </div>
          </Card>

          {uploadedDocs.length > 0 && (
            <Card title="アップロード済み書類">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {uploadedDocs.map((doc, i) => (
                  <div key={i} style={{
                    borderRadius: 10, padding: 14,
                    border: `1px solid ${doc.analyzing ? "#fde68a" : "#bbf7d0"}`,
                    background: doc.analyzing ? "#fffbeb" : "#f0fdf4",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: "bold", color: "#6b7280", marginRight: 8 }}>{doc.doc_type}</span>
                        <span style={{ fontSize: 13 }}>{doc.file_name}</span>
                      </div>
                      {doc.analyzing
                        ? <span style={{ fontSize: 12, color: "#d97706", fontWeight: "bold" }}>🤖 AI解析中...</span>
                        : <span style={{ fontSize: 12, color: "#16a34a", fontWeight: "bold" }}>✅ 解析完了</span>
                      }
                    </div>
                    {doc.extracted && !doc.analyzing && (
                      <div style={{ fontSize: 12, background: "#fff", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: "bold", color: "#374151", marginBottom: 4 }}>抽出された情報：</div>
                        {Object.entries(doc.extracted).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", gap: 8 }}>
                            <span style={{ color: "#9ca3af", width: 120, flexShrink: 0 }}>{k}:</span>
                            <span style={{ color: "#374151" }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStep(1)} style={btnSecondary}>← 戻る</button>
            <button onClick={() => setStep(3)} style={{ ...btnPrimary, flex: 2 }}>
              {uploadedDocs.length > 0 ? "次へ：情報を確認・補足 →" : "スキップして手動入力 →"}
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3 ===== */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {uploadedDocs.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534" }}>
              ✅ AIが自動入力した項目があります。内容を確認・修正してください。
            </div>
          )}

          {/* 売主情報 */}
          <Card title="売主情報">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="氏名" value={form.seller_name} onChange={(v) => f("seller_name", v)} placeholder="山田 太郎" />
                <Field label="フリガナ" value={form.seller_name_kana} onChange={(v) => f("seller_name_kana", v)} />
              </div>
              <Field label="法人名（法人売主の場合）" value={form.seller_company} onChange={(v) => f("seller_company", v)} />
              <Field label="住所" value={form.seller_address} onChange={(v) => f("seller_address", v)} />
              <Field label="電話番号" value={form.seller_phone} onChange={(v) => f("seller_phone", v)} type="tel" />
            </div>
          </Card>

          {/* 買主情報 */}
          <Card title="買主情報（顧客から自動セット）">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="氏名" value={form.buyer_name} onChange={(v) => f("buyer_name", v)} />
                <Field label="フリガナ" value={form.buyer_name_kana} onChange={(v) => f("buyer_name_kana", v)} />
              </div>
              <Field label="住所" value={form.buyer_address} onChange={(v) => f("buyer_address", v)} />
              <Field label="電話番号" value={form.buyer_phone} onChange={(v) => f("buyer_phone", v)} type="tel" />
            </div>
          </Card>

          {/* 物件情報 */}
          <Card title="物件情報（登記記録）">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="所在地（登記上）" value={form.property_address} onChange={(v) => f("property_address", v)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="土地面積（㎡）" value={form.property_area_land} onChange={(v) => f("property_area_land", v)} />
                <Field label="建物面積（㎡）" value={form.property_area_build} onChange={(v) => f("property_area_build", v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="構造" value={form.property_structure} onChange={(v) => f("property_structure", v)} placeholder="木造2階建て" />
                <Field label="建築年" value={form.property_built_year} onChange={(v) => f("property_built_year", v)} placeholder="2005" />
              </div>
            </div>
          </Card>

          {/* 法令制限 */}
          <Card title="法令制限（重説用）">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="用途地域" value={form.zoning} onChange={(v) => f("zoning", v)} placeholder="第一種低層住居" />
              <Field label="建蔽率（%）" value={form.building_coverage} onChange={(v) => f("building_coverage", v)} placeholder="60" />
              <Field label="容積率（%）" value={form.floor_area_ratio} onChange={(v) => f("floor_area_ratio", v)} placeholder="150" />
            </div>
          </Card>

          {/* 取引金額 */}
          <Card title="取引金額">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="売買代金（円）" value={form.price} onChange={(v) => f("price", v)} />
              <Field label="手付金（円）" value={form.deposit} onChange={(v) => f("deposit", v)} />
              {propertyTypeDoc.includes("土地建物") && (
                <>
                  <Field label="うち土地価格（円）" value={form.price_land} onChange={(v) => f("price_land", v)} />
                  <Field label="うち建物価格（円）" value={form.price_building} onChange={(v) => f("price_building", v)} />
                  <Field label="消費税相当額（円）" value={form.price_tax} onChange={(v) => f("price_tax", v)} />
                </>
              )}
            </div>
          </Card>

          {/* 日程 */}
          <Card title="日程">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="契約日" value={form.contract_date} onChange={(v) => f("contract_date", v)} type="date" />
              <Field label="手付解除期日" value={form.deposit_deadline} onChange={(v) => f("deposit_deadline", v)} type="date" />
              <Field label="引渡日" value={form.delivery_date} onChange={(v) => f("delivery_date", v)} type="date" />
            </div>
          </Card>

          {/* 宅建士 */}
          <Card title="重要事項説明 担当宅建士">
            <select
              value={form.takken_staff_id}
              onChange={(e) => f("takken_staff_id", e.target.value)}
              style={inputStyle}
            >
              <option value="">選択してください</option>
              {staffList.filter((s) => s.takken_number).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（宅建士登録番号: {s.takken_number}）
                </option>
              ))}
            </select>
          </Card>

          {/* メモ */}
          <Card title="備考・特記事項">
            <textarea
              value={form.notes}
              onChange={(e) => f("notes", e.target.value)}
              rows={4}
              placeholder="AI抽出の補足やその他特記事項..."
              style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
            />
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStep(2)} style={btnSecondary}>← 戻る</button>
            <button onClick={handleSave} disabled={saving || !customerId} style={{
              ...btnSave, flex: 2, opacity: saving || !customerId ? 0.5 : 1,
            }}>
              {saving ? "保存中..." : "💾 保存してWordを生成 →"}
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 4 ===== */}
      {step === 4 && contractId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: "bold", color: "#1c1b18" }}>
              契約書セットが作成されました
            </h2>
            <p style={{ fontSize: 13, color: "#706e68", marginTop: 8 }}>
              各書類をダウンロードして内容を確認・修正してください
            </p>
          </div>

          <Card title="📄 書類のダウンロード">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { type: "cover",    label: "📋 表紙" },
                { type: "jyusetsu", label: "📘 重要事項説明書" },
                { type: "contract", label: "📝 売買契約書" },
                { type: "extra",    label: "📑 借地説明書（借地権物件のみ）" },
              ] as { type: string; label: string }[]).map((item) => (
                <a
                  key={item.type}
                  href={downloadUrl(item.type)}
                  download
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", border: "2px solid #e5e7eb", borderRadius: 12,
                    background: "#fafaf8", textDecoration: "none", color: "#1c1b18",
                    fontSize: 14, fontWeight: "bold",
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#1a3a2a", fontWeight: "bold" }}>
                    ⬇ ダウンロード
                  </span>
                </a>
              ))}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => router.push("/admin/contracts")}
              style={btnSecondary}
            >
              契約書一覧へ
            </button>
            <button
              onClick={() => router.push(`/admin/contracts/${contractId}`)}
              style={{ ...btnPrimary, flex: 2 }}
            >
              この契約書を開く →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 共通スタイル =====
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};
const btnPrimary: React.CSSProperties = {
  flex: 1, background: "#1a3a2a", color: "#fff", padding: "14px",
  borderRadius: 12, border: "none", fontWeight: "bold", fontSize: 14,
  cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  flex: 1, border: "2px solid #e5e7eb", background: "#fff", color: "#374151",
  padding: "14px", borderRadius: 12, fontWeight: "bold", fontSize: 14, cursor: "pointer",
};
const btnSave: React.CSSProperties = {
  background: "#c9a96e", color: "#fff", padding: "14px", borderRadius: 12,
  border: "none", fontWeight: "bold", fontSize: 14, cursor: "pointer",
};

// ===== 小コンポーネント =====
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h2 style={{ fontWeight: "bold", color: "#374151", marginBottom: 16, fontSize: 14 }}>{title}</h2>
      {children}
    </div>
  );
}

function SelectCard({ selected, onClick, label, desc }: {
  selected: boolean; onClick: () => void; label: string; desc: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "14px", border: `2px solid ${selected ? "#1a3a2a" : "#e5e7eb"}`,
      borderRadius: 12, textAlign: "left", cursor: "pointer",
      background: selected ? "rgba(26,58,42,0.05)" : "#fff",
    }}>
      <div style={{ fontWeight: "bold", fontSize: 13, color: "#1c1b18" }}>{label}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{desc}</div>
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: "bold", color: "#6b7280", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}
