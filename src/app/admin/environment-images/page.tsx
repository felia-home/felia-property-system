"use client";
import { useEffect, useRef, useState } from "react";

const FACILITY_TYPES: Record<string, string> = {
  SCHOOL: "学校",
  SUPERMARKET: "スーパー",
  PARK: "公園",
  STATION: "駅",
  HOSPITAL: "病院",
  CONVENIENCE_STORE: "コンビニ",
  OTHER: "その他",
};

interface EnvImage {
  id: string;
  url: string;
  filename: string;
  facility_type: string;
  facility_name: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  caption: string | null;
  ai_caption: string | null;
  created_at: string;
}

export default function EnvironmentImagesPage() {
  const [images, setImages] = useState<EnvImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Upload form state
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upType, setUpType] = useState("OTHER");
  const [upName, setUpName] = useState("");
  const [upCity, setUpCity] = useState("");
  const [upAddress, setUpAddress] = useState("");
  const [upLat, setUpLat] = useState("");
  const [upLng, setUpLng] = useState("");
  const [upCaption, setUpCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("type", filter);
    if (cityFilter) params.set("city", cityFilter);
    const res = await fetch(`/api/environment-images?${params}`);
    const data = await res.json();
    setImages(data.images ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, cityFilter]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upFile) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", upFile);
    fd.append("facility_type", upType);
    if (upName) fd.append("facility_name", upName);
    if (upCity) fd.append("city", upCity);
    if (upAddress) fd.append("address", upAddress);
    if (upLat) fd.append("latitude", upLat);
    if (upLng) fd.append("longitude", upLng);
    if (upCaption) fd.append("caption", upCaption);

    await fetch("/api/environment-images", { method: "POST", body: fd });
    setUploading(false);
    setShowUpload(false);
    setUpFile(null); setUpName(""); setUpCity(""); setUpAddress("");
    setUpLat(""); setUpLng(""); setUpCaption("");
    load();
  };

  const cities = Array.from(new Set(images.map(i => i.city).filter(Boolean))) as string[];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>周辺環境写真</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>複数物件で共有できる周辺施設写真のマスタ管理</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          + 写真を追加
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} style={{
          background: "#fff", borderRadius: 12, border: "1px solid #e0deda",
          padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>新規周辺環境写真アップロード</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>施設種別 *</label>
              <select value={upType} onChange={e => setUpType(e.target.value)} style={inputStyle}>
                {Object.entries(FACILITY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>施設名</label>
              <input value={upName} onChange={e => setUpName(e.target.value)} placeholder="〇〇スーパー、〇〇公園 等" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>市区町村</label>
              <input value={upCity} onChange={e => setUpCity(e.target.value)} placeholder="目黒区" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>住所</label>
              <input value={upAddress} onChange={e => setUpAddress(e.target.value)} placeholder="目黒1-1-1" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>緯度</label>
              <input value={upLat} onChange={e => setUpLat(e.target.value)} placeholder="35.6330" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>経度</label>
              <input value={upLng} onChange={e => setUpLng(e.target.value)} placeholder="139.7150" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>キャプション</label>
              <input value={upCaption} onChange={e => setUpCaption(e.target.value)} placeholder="徒歩5分・24時間営業" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>写真ファイル *</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed #d0cec8", borderRadius: 8, padding: "20px",
                textAlign: "center", cursor: "pointer", fontSize: 13, color: "#706e68",
                background: upFile ? "#f0f7f2" : "#fafaf8",
              }}
            >
              {upFile ? `✓ ${upFile.name}` : "クリックして画像を選択"}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && setUpFile(e.target.files[0])} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={!upFile || uploading}
              style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: upFile ? "#234f35" : "#d0cec8", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {uploading ? "アップロード中..." : "アップロード"}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
          <option value="">全施設種別</option>
          {Object.entries(FACILITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
          <option value="">全エリア</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#706e68", alignSelf: "center" }}>{images.length}件</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#706e68", fontSize: 13 }}>読み込み中...</div>
      ) : images.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#706e68", fontSize: 13 }}>写真がありません。「写真を追加」から登録してください。</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {images.map((img) => (
            <div key={img.id} style={{ border: "1px solid #e0deda", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <img src={img.url} alt={img.ai_caption ?? img.caption ?? ""} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <span style={{ background: "#f0f7f2", color: "#234f35", fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 500 }}>
                    {FACILITY_TYPES[img.facility_type] ?? img.facility_type}
                  </span>
                </div>
                {img.facility_name && <div style={{ fontSize: 12, fontWeight: 500 }}>{img.facility_name}</div>}
                {(img.ai_caption || img.caption) && (
                  <div style={{ fontSize: 11, color: "#706e68", marginTop: 2, lineHeight: 1.4 }}>
                    {img.ai_caption ?? img.caption}
                  </div>
                )}
                {img.city && <div style={{ fontSize: 10, color: "#b0ae9c", marginTop: 3 }}>{img.city}</div>}
                {img.latitude && img.longitude && (
                  <div style={{ fontSize: 10, color: "#b0ae9c" }}>📍 {img.latitude.toFixed(4)}, {img.longitude.toFixed(4)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "#706e68", marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
