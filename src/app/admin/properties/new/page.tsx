"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    property_type: "USED_HOUSE",
    prefecture: "東京都",
    city: "",
    address: "",
    price: "",
    station_line: "",
    station_name: "",
    station_walk: "",
    area_build_m2: "",
    area_land_m2: "",
    rooms: "",
    building_year: "",
    structure: "",
    delivery_timing: "",
    management_fee: "",
    repair_reserve: "",
    reins_number: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), station_walk: Number(form.station_walk) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登録に失敗しました"); setSaving(false); return; }
      router.push("/admin/properties");
    } catch {
      setError("通信エラーが発生しました");
      setSaving(false);
    }
  };

  const Field = ({ label, k, placeholder, type = "text", required = false }: { label: string; k: string; placeholder?: string; type?: string; required?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>{label}{required && <span style={{ color: "#8c1f1f", marginLeft: 2 }}>*</span>}</label>
      <input type={type} value={(form as Record<string,string>)[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder}
        style={{ padding: "8px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit" }} />
    </div>
  );

  return (
    <div style={{ padding: 28, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件新規登録</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>登録後はステータス「下書き」で保存されます</p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#706e68", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #e0deda" }}>基本情報</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#706e68" }}>物件種別<span style={{ color: "#8c1f1f", marginLeft: 2 }}>*</span></label>
              <select value={form.property_type} onChange={(e) => set("property_type", e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit" }}>
                <option value="NEW_HOUSE">新築戸建</option>
                <option value="USED_HOUSE">中古戸建</option>
                <option value="MANSION">マンション（中古）</option>
                <option value="NEW_MANSION">新築マンション</option>
                <option value="LAND">土地</option>
              </select>
            </div>
            <Field label="価格（万円）" k="price" placeholder="8280" type="number" required />
            <Field label="市区町村" k="city" placeholder="目黒区南" required />
            <Field label="番地以降" k="address" placeholder="2丁目×番×号" />
            <Field label="路線名" k="station_line" placeholder="東急東横線" />
            <Field label="最寄駅" k="station_name" placeholder="都立大学" required />
            <Field label="徒歩（分）" k="station_walk" placeholder="8" type="number" required />
            <Field label="間取り" k="rooms" placeholder="3LDK" />
            <Field label="建物面積（㎡）" k="area_build_m2" placeholder="85.2" type="number" />
            <Field label="土地面積（㎡）" k="area_land_m2" placeholder="120.5" type="number" />
            <Field label="築年（西暦）" k="building_year" placeholder="2010" type="number" />
            <Field label="構造" k="structure" placeholder="RC造" />
            <Field label="引渡し時期" k="delivery_timing" placeholder="即時・2025年6月" />
            <Field label="管理費（円/月）" k="management_fee" placeholder="15000" type="number" />
            <Field label="修繕積立金（円/月）" k="repair_reserve" placeholder="12000" type="number" />
            <Field label="レインズ番号" k="reins_number" placeholder="30012345678" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => router.back()} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "登録中..." : "登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}