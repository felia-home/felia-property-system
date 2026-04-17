"use client";
import { useEffect, useRef, useState } from "react";
import MansionBulkImport from "@/components/admin/MansionBulkImport";

interface ExteriorImage {
  id: string;
  url: string;
  is_primary: boolean;
}

interface Mansion {
  id: string;
  name: string;
  name_kana: string | null;
  city: string | null;
  address: string | null;
  total_units: number | null;
  built_year: number | null;
  built_month: number | null;
  structure: string | null;
  floors_total: number | null;
  management_company: string | null;
  exterior_images: ExteriorImage[];
  created_at: string;
}

export default function MansionsPage() {
  const [mansions, setMansions] = useState<Mansion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [builtYear, setBuiltYear] = useState("");
  const [structure, setStructure] = useState("");
  const [floorsTotal, setFloorsTotal] = useState("");
  const [mgmtCompany, setMgmtCompany] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (q?: string) => {
    setLoading(true);
    const params = q ? `?name=${encodeURIComponent(q)}` : "?name=　";
    const res = await fetch(`/api/mansions${params}`);
    const data = await res.json();
    // For full list, use a search with a wildcard-like approach by fetching all
    if (!q) {
      // GET all by empty search — API returns empty, so fetch with space trick
      const res2 = await fetch("/api/mansions?name=");
      const d2 = await res2.json();
      setMansions(d2.mansions ?? []);
    } else {
      setMansions(data.mansions ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => load(search || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append("name", name);
    if (nameKana) fd.append("name_kana", nameKana);
    if (city) fd.append("city", city);
    if (address) fd.append("address", address);
    if (totalUnits) fd.append("total_units", totalUnits);
    if (builtYear) fd.append("built_year", builtYear);
    if (structure) fd.append("structure", structure);
    if (floorsTotal) fd.append("floors_total", floorsTotal);
    if (mgmtCompany) fd.append("management_company", mgmtCompany);
    if (imageFile) fd.append("image", imageFile);

    const res = await fetch("/api/mansions", { method: "POST", body: fd });
    if (res.ok) {
      setShowForm(false);
      setName(""); setNameKana(""); setCity(""); setAddress("");
      setTotalUnits(""); setBuiltYear(""); setStructure(""); setFloorsTotal("");
      setMgmtCompany(""); setImageFile(null);
      load();
    }
    setSubmitting(false);
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>マンション建物マスタ</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>外観写真・建物情報の一元管理。複数物件で共有されます。</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setShowBulkImport(!showBulkImport); setShowForm(false); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: showBulkImport ? "#e8f5e9" : "#f7f6f2", color: showBulkImport ? "#234f35" : "#444", border: "1px solid #e0deda", cursor: "pointer", fontFamily: "inherit" }}
          >
            📁 フォルダ一括インポート
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulkImport(false); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            + 新規マンション登録
          </button>
        </div>
      </div>

      {/* Bulk import */}
      {showBulkImport && (
        <MansionBulkImport onComplete={() => { load(); setShowBulkImport(false); }} />
      )}

      {/* New mansion form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>マンション新規登録</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>マンション名 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="〇〇マンション" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>マンション名（読み）</label>
              <input value={nameKana} onChange={e => setNameKana(e.target.value)} placeholder="まんしょんなまえ" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>市区町村</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="目黒区" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>住所</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="目黒1-1-1" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>総戸数</label>
              <input value={totalUnits} onChange={e => setTotalUnits(e.target.value)} type="number" placeholder="50" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>築年</label>
              <input value={builtYear} onChange={e => setBuiltYear(e.target.value)} type="number" placeholder="2010" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>構造</label>
              <input value={structure} onChange={e => setStructure(e.target.value)} placeholder="RC造" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>地上階数</label>
              <input value={floorsTotal} onChange={e => setFloorsTotal(e.target.value)} type="number" placeholder="15" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>管理会社</label>
              <input value={mgmtCompany} onChange={e => setMgmtCompany(e.target.value)} placeholder="〇〇管理株式会社" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>外観写真（プライマリ）</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: "2px dashed #d0cec8", borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", fontSize: 13, color: "#706e68", background: imageFile ? "#f0f7f2" : "#fafaf8" }}
            >
              {imageFile ? `✓ ${imageFile.name}` : "クリックして外観写真を選択"}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={!name.trim() || submitting}
              style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: name ? "#234f35" : "#d0cec8", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {submitting ? "登録中..." : "登録する"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="マンション名で検索"
          style={{ padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, width: 240, fontFamily: "inherit" }}
        />
        <button onClick={handleSearch}
          style={{ padding: "6px 14px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, background: "#f7f6f2", cursor: "pointer", fontFamily: "inherit" }}>
          検索
        </button>
        <span style={{ fontSize: 12, color: "#706e68", alignSelf: "center" }}>{mansions.length}件</span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#706e68", fontSize: 13 }}>読み込み中...</div>
      ) : mansions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#706e68", fontSize: 13 }}>マンションが登録されていません。</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {mansions.map((m) => {
            const primaryImg = m.exterior_images.find(i => i.is_primary) ?? m.exterior_images[0];
            return (
              <div key={m.id} style={{ border: "1px solid #e0deda", borderRadius: 12, overflow: "hidden", background: "#fff", display: "flex", gap: 0 }}>
                {primaryImg ? (
                  <img src={primaryImg.url} alt={m.name} style={{ width: 100, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 100, background: "#f3f2ef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#d0cec8", flexShrink: 0 }}>🏢</div>
                )}
                <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                  {m.name_kana && <div style={{ fontSize: 11, color: "#706e68", marginBottom: 4 }}>{m.name_kana}</div>}
                  <div style={{ fontSize: 11, color: "#706e68", lineHeight: 1.8 }}>
                    {m.city && <div>📍 {m.city}{m.address ? ` ${m.address}` : ""}</div>}
                    {m.built_year && <div>🏗 {m.built_year}年{m.built_month ? `${m.built_month}月` : ""}築</div>}
                    {m.total_units && <div>🏠 全{m.total_units}戸</div>}
                    {m.structure && <div>🔧 {m.structure}{m.floors_total ? ` ${m.floors_total}階建` : ""}</div>}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "#b0ae9c" }}>
                    外観写真 {m.exterior_images.length}枚
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "#706e68", marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
