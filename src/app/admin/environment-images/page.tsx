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

  // 一括アップロード
  type PlaceCandidate = { name: string; category: string; lat: number; lng: number };
  type BulkItem = {
    file: File;
    previewUrl: string;
    facilityName: string;
    searchName: string;
    candidates: PlaceCandidate[];
    selectedCandidate: PlaceCandidate | null;
    searching: boolean;
    uploading: boolean;
    uploaded: boolean;
    analyzing: boolean;
    error: string | null;
  };
  const [bulkItems, setBulkItems]       = useState<BulkItem[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [showBulk, setShowBulk]         = useState(false);
  const [centerLat, setCenterLat]       = useState("35.689");
  const [centerLng, setCenterLng]       = useState("139.692");

  // 編集
  const [editTarget, setEditTarget] = useState<{
    id: string;
    facility_name: string;
    facility_type: string;
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    caption: string;
  } | null>(null);

  // 編集モーダル内ジオコード
  const [geocodingEdit, setGeocodingEdit] = useState(false);

  // 東京都内の座標かチェック（緯度35.4〜35.95、経度138.9〜140.0）
  const isTokyoCoords = (lat: number, lng: number): boolean =>
    lat >= 35.4 && lat <= 35.95 && lng >= 138.9 && lng <= 140.0;

  const handleEditGeocode = async () => {
    if (!editTarget) return;
    if (!editTarget.facility_name) {
      alert("施設名を入力してください");
      return;
    }

    setGeocodingEdit(true);
    try {
      // GSI AddressSearch のみで検索（Overpass は使わない）
      const queries = [
        editTarget.city ? `${editTarget.city}${editTarget.facility_name}` : null,
        `東京都${editTarget.facility_name}`,
        editTarget.facility_name,
      ].filter(Boolean) as string[];

      // 「○○区」→「○○」（市区町村 suffix 除去でタイトルマッチに使う）
      const cityCore = editTarget.city
        ? editTarget.city.replace(/区$|市$|町$|村$/, "")
        : "";

      let found = false;
      for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        try {
          const res = await fetch(
            `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`,
            { signal: AbortSignal.timeout(5000) }
          );
          const data = await res.json() as {
            geometry?: { coordinates?: [number, number] };
            properties?: { title?: string };
          }[];
          if (Array.isArray(data) && data.length > 0 && data[0]?.geometry?.coordinates) {
            const [lng, lat] = data[0].geometry.coordinates;
            const title = data[0].properties?.title || "";

            // 東京都外の座標はスキップ
            if (!isTokyoCoords(lat, lng)) continue;

            // 市区町村が指定されていてタイトルが一致しない場合は次の候補へ
            // ただし最後の候補なら採用（fallback）
            const isLastCandidate = i === queries.length - 1;
            if (cityCore && title && !title.includes(cityCore) && !isLastCandidate) {
              continue;
            }

            setEditTarget(prev => prev ? {
              ...prev,
              address:   title,
              latitude:  String(lat),
              longitude: String(lng),
            } : null);
            found = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!found) {
        alert("住所・座標を取得できませんでした。\n施設名・エリアを確認してください。");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setGeocodingEdit(false);
    }
  };

  // AI解析
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/environment-images/${id}/analyze`, { method: "POST" });
      await load();
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAnalyzeAll = async () => {
    if (!confirm("全写真をAI解析します。1件ずつ処理するため時間がかかります。よろしいですか？")) return;
    for (const image of images) {
      await handleAnalyze(image.id);
      await new Promise(r => setTimeout(r, 1000));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await fetch(`/api/environment-images/${id}`, { method: "DELETE" });
    await load();
  };

  // キャプション自動生成: 「市区町村 + 施設名」
  const autoCaption = () => {
    if (!editTarget) return;
    const area = editTarget.city || "";
    const name = editTarget.facility_name || "";
    if (!area && !name) return;
    setEditTarget(prev => prev ? { ...prev, caption: `${area}${name}` } : null);
  };

  // 緯度経度の再取得（国土地理院 AddressSearch）
  const handleReGeocode = async () => {
    if (!editTarget) return;
    if (!editTarget.facility_name) {
      alert("施設名を入力してください");
      return;
    }
    const query = `東京都 ${editTarget.city ?? ""} ${editTarget.facility_name}`.trim();
    try {
      const res = await fetch(
        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json() as { geometry?: { coordinates?: [number, number] } }[];
      if (Array.isArray(data) && data.length > 0 && data[0]?.geometry?.coordinates) {
        const [lng, lat] = data[0].geometry.coordinates;
        if (!isTokyoCoords(lat, lng)) {
          alert(`東京都外の座標が返されました（${lat.toFixed(4)}, ${lng.toFixed(4)}）。\n施設名・エリアを確認してください。`);
          return;
        }
        setEditTarget(prev => prev ? {
          ...prev,
          latitude:  String(lat),
          longitude: String(lng),
        } : null);
      } else {
        alert("座標を取得できませんでした。施設名・エリアを確認してください。");
      }
    } catch {
      alert("座標取得に失敗しました");
    }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    await fetch(`/api/environment-images/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_name: editTarget.facility_name || null,
        facility_type: editTarget.facility_type || null,
        city:          editTarget.city || null,
        address:       editTarget.address || null,
        latitude:      editTarget.latitude  ? parseFloat(editTarget.latitude)  : null,
        longitude:     editTarget.longitude ? parseFloat(editTarget.longitude) : null,
        caption:       editTarget.caption || null,
      }),
    });
    setEditTarget(null);
    await load();
  };

  const extractFacilityName = (filename: string): string => {
    let n = filename.replace(/\.[^.]+$/, "");
    n = n.replace(/^[\d_\-\s]+/, "");
    n = n.replace(/[\d_\-\s]+$/, "");
    return n.trim();
  };

  const handleBulkFiles = async (files: FileList) => {
    const items: BulkItem[] = Array.from(files).map(file => ({
      file,
      previewUrl:        URL.createObjectURL(file),
      facilityName:      extractFacilityName(file.name),
      searchName:        extractFacilityName(file.name),
      candidates:        [],
      selectedCandidate: null,
      searching:         false,
      uploading:         false,
      uploaded:          false,
      analyzing:         false,
      error:             null,
    }));
    setBulkItems(prev => [...prev, ...items]);

    for (const item of items) {
      if (!item.searchName) continue;
      setBulkItems(prev => prev.map(p =>
        p.file === item.file ? { ...p, searching: true } : p
      ));
      try {
        const res = await fetch(
          `/api/places/search?name=${encodeURIComponent(item.searchName)}&lat=${centerLat}&lng=${centerLng}`
        );
        const data = await res.json();
        const candidates: PlaceCandidate[] = data.candidates ?? [];
        setBulkItems(prev => prev.map(p =>
          p.file === item.file
            ? {
                ...p,
                searching: false,
                candidates,
                selectedCandidate: candidates.find(c => c.name === item.searchName) ?? null,
              }
            : p
        ));
      } catch {
        setBulkItems(prev => prev.map(p =>
          p.file === item.file ? { ...p, searching: false } : p
        ));
      }
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const handleBulkUpload = async () => {
    setBulkUploading(true);
    try {
      for (const item of bulkItems) {
        if (item.uploaded) continue;
        setBulkItems(prev => prev.map(p =>
          p.file === item.file ? { ...p, uploading: true, error: null } : p
        ));
        try {
          const candidate = item.selectedCandidate;
          const fd = new FormData();
          fd.append("file", item.file);
          fd.append("facility_name", candidate?.name || item.facilityName);
          fd.append("facility_type", "OTHER");
          if (candidate?.lat) fd.append("latitude",  String(candidate.lat));
          if (candidate?.lng) fd.append("longitude", String(candidate.lng));

          const res = await fetch("/api/environment-images", { method: "POST", body: fd });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const uploadData = await res.json();

          // アップロード成功
          setBulkItems(prev => prev.map(p =>
            p.file === item.file
              ? { ...p, uploading: false, uploaded: true, analyzing: !!uploadData.image?.id }
              : p
          ));

          // 後段でAI解析を発火（fire-and-forget。完了時にUIへ反映）
          if (uploadData.image?.id) {
            fetch(`/api/environment-images/${uploadData.image.id}/analyze`, { method: "POST" })
              .then(async (r) => {
                const data = await r.json();
                if (data.ok) {
                  setBulkItems(prev => prev.map(p =>
                    p.file === item.file
                      ? {
                          ...p,
                          analyzing:    false,
                          facilityName: data.analyzed?.facility_name || p.facilityName,
                          searchName:   data.analyzed?.facility_name || p.searchName,
                        }
                      : p
                  ));
                } else {
                  setBulkItems(prev => prev.map(p =>
                    p.file === item.file ? { ...p, analyzing: false } : p
                  ));
                }
              })
              .catch(() => {
                setBulkItems(prev => prev.map(p =>
                  p.file === item.file ? { ...p, analyzing: false } : p
                ));
              });
          }
        } catch (err) {
          console.error("bulk env upload failed:", err);
          setBulkItems(prev => prev.map(p =>
            p.file === item.file ? { ...p, uploading: false, error: "失敗" } : p
          ));
        }
      }
      // 3秒後に一覧を再取得（AI解析が完了するのを待つ）
      setTimeout(() => { void load(); }, 3000);
    } finally {
      setBulkUploading(false);
    }
  };

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleAnalyzeAll}
            disabled={images.length === 0}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: "1px solid #e9d5ff",
              background: images.length === 0 ? "#f3f4f6" : "#faf5ff",
              color: images.length === 0 ? "#9ca3af" : "#7c3aed",
              cursor: images.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            ✨ 全件AI解析
          </button>
          <button
            onClick={() => setShowBulk(v => !v)}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: "1px solid #86efac",
              background: showBulk ? "#dcfce7" : "#f0fdf4",
              color: "#166534", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            📤 一括アップロード
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            + 写真を追加
          </button>
        </div>
      </div>

      {/* 一括アップロードパネル */}
      {showBulk && (
        <div style={{
          marginBottom: 20, padding: 20,
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>
            📤 周辺環境写真 一括アップロード
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
              施設検索の中心座標:
            </span>
            <input
              type="text" value={centerLat}
              onChange={e => setCenterLat(e.target.value)}
              placeholder="緯度"
              style={{ width: 110, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }}
            />
            <input
              type="text" value={centerLng}
              onChange={e => setCenterLng(e.target.value)}
              placeholder="経度"
              style={{ width: 110, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }}
            />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              物件の緯度経度を入力すると候補精度が上がります
            </span>
          </div>

          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 6, fontSize: 13,
            background: "#fff", border: "2px dashed #d1d5db",
            cursor: "pointer", color: "#374151", marginBottom: 16,
          }}>
            📂 複数ファイルを選択
            <input
              type="file" accept="image/*" multiple
              style={{ display: "none" }}
              onChange={e => e.target.files && handleBulkFiles(e.target.files)}
            />
          </label>

          {bulkItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {bulkItems.map((item, idx) => (
                <div key={idx} style={{
                  display: "flex", gap: 10, padding: 10,
                  border: `1px solid ${item.uploaded ? "#86efac" : item.error ? "#fca5a5" : "#e5e7eb"}`,
                  borderRadius: 8,
                  background: item.uploaded ? "#f0fdf4" : "#fff",
                }}>
                  <img
                    src={item.previewUrl} alt=""
                    style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <input
                        type="text" value={item.searchName}
                        onChange={e => setBulkItems(prev => prev.map((p, i) =>
                          i === idx ? { ...p, searchName: e.target.value } : p
                        ))}
                        placeholder="施設名"
                        style={{ flex: 1, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                      <button type="button"
                        onClick={async () => {
                          setBulkItems(prev => prev.map((p, i) => i === idx ? { ...p, searching: true, candidates: [] } : p));
                          const res = await fetch(`/api/places/search?name=${encodeURIComponent(item.searchName)}&lat=${centerLat}&lng=${centerLng}`);
                          const data = await res.json();
                          setBulkItems(prev => prev.map((p, i) => i === idx ? { ...p, searching: false, candidates: data.candidates ?? [] } : p));
                        }}
                        disabled={item.searching}
                        style={{
                          padding: "4px 8px", borderRadius: 6, fontSize: 11,
                          border: "1px solid #d1d5db", background: "#fff",
                          cursor: item.searching ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                        }}>
                        {item.searching ? "🔍..." : "🔍"}
                      </button>
                    </div>
                    {item.candidates.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {item.candidates.map((c, ci) => (
                          <button key={ci} type="button"
                            onClick={() => setBulkItems(prev => prev.map((p, i) =>
                              i === idx ? { ...p, selectedCandidate: c } : p
                            ))}
                            style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 11, cursor: "pointer",
                              border: `1px solid ${item.selectedCandidate?.name === c.name ? "#86efac" : "#e5e7eb"}`,
                              background: item.selectedCandidate?.name === c.name ? "#f0fdf4" : "#f9fafb",
                              fontFamily: "inherit",
                            }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.candidates.length === 0 && !item.searching && item.searchName && (
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        候補なし — 施設名を変更して再検索してください
                      </div>
                    )}
                    {item.selectedCandidate && (
                      <div style={{ fontSize: 11, color: "#166534", marginTop: 3 }}>
                        ✅ {item.selectedCandidate.name}
                      </div>
                    )}
                    {item.analyzing && (
                      <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>
                        ✨ AI解析中...
                      </div>
                    )}
                    {item.error && (
                      <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>❌ {item.error}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", minWidth: 40, justifyContent: "center" }}>
                    {item.uploaded
                      ? <span>✅</span>
                      : item.uploading
                        ? <span style={{ fontSize: 11, color: "#9ca3af" }}>送信中</span>
                        : <button type="button"
                            onClick={() => setBulkItems(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>
                    }
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button"
                  onClick={() => setBulkItems([])}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  クリア
                </button>
                {bulkItems.some(i => !i.uploaded) && (
                  <button type="button" onClick={handleBulkUpload} disabled={bulkUploading}
                    style={{
                      padding: "8px 20px", borderRadius: 6, border: "none",
                      background: bulkUploading ? "#e5e7eb" : "#5BAD52",
                      color: bulkUploading ? "#9ca3af" : "#fff",
                      fontSize: 13, fontWeight: "bold",
                      cursor: bulkUploading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}>
                    {bulkUploading
                      ? "アップロード中..."
                      : `📤 ${bulkItems.filter(i => !i.uploaded).length}件をまとめて登録`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
                {(img.caption || img.ai_caption) && (
                  <div style={{ fontSize: 11, color: "#706e68", marginTop: 2, lineHeight: 1.4 }}>
                    {img.caption ?? img.ai_caption}
                  </div>
                )}
                {img.city && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{img.city}</div>}
                {img.address && (
                  <div style={{
                    fontSize: 11, color: "#9ca3af", marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    📍 {img.address}
                  </div>
                )}
                {img.latitude && img.longitude && (
                  <div style={{ fontSize: 10, color: "#d1d5db", marginTop: 2 }}>
                    {img.latitude.toFixed(4)}, {img.longitude.toFixed(4)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 10px 6px" }}>
                <button
                  type="button"
                  onClick={() => handleAnalyze(img.id)}
                  disabled={analyzingIds.has(img.id)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12,
                    border: "1px solid #e9d5ff", background: "#faf5ff",
                    color: analyzingIds.has(img.id) ? "#9ca3af" : "#7c3aed",
                    cursor: analyzingIds.has(img.id) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {analyzingIds.has(img.id) ? "✨ 解析中..." : "✨ AI解析"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 10px 10px" }}>
                <button
                  type="button"
                  onClick={() => setEditTarget({
                    id:            img.id,
                    facility_name: img.facility_name ?? "",
                    facility_type: img.facility_type ?? "",
                    city:          img.city ?? "",
                    address:       img.address ?? "",
                    latitude:      img.latitude  != null ? String(img.latitude)  : "",
                    longitude:     img.longitude != null ? String(img.longitude) : "",
                    caption:       img.caption ?? img.ai_caption ?? "",
                  })}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12,
                    border: "1px solid #d1d5db", background: "#fff",
                    color: "#374151", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ✏️ 編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id, img.facility_name ?? "名称未設定")}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12,
                    border: "1px solid #fca5a5", background: "#fff",
                    color: "#ef4444", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 12,
            padding: 28, width: "100%", maxWidth: 440,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, margin: "0 0 16px" }}>
              ✏️ 写真情報を編集
            </h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                施設名
              </label>
              <input
                type="text"
                value={editTarget.facility_name}
                onChange={e => setEditTarget(prev => prev ? { ...prev, facility_name: e.target.value } : null)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                施設種別
              </label>
              <select
                value={editTarget.facility_type}
                onChange={e => setEditTarget(prev => prev ? { ...prev, facility_type: e.target.value } : null)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
              >
                <option value="">その他</option>
                {Object.entries(FACILITY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleEditGeocode}
                disabled={geocodingEdit}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 13,
                  border: "1px solid #bfdbfe",
                  background: geocodingEdit ? "#e5e7eb" : "#eff6ff",
                  color: geocodingEdit ? "#9ca3af" : "#1d4ed8",
                  fontWeight: "bold",
                  cursor: geocodingEdit ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {geocodingEdit
                  ? "🔍 検索中..."
                  : "🔍 市区町村＋施設名から住所・座標を取得"}
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                市区町村
              </label>
              <input
                type="text"
                value={editTarget.city}
                onChange={e => setEditTarget(prev => prev ? { ...prev, city: e.target.value } : null)}
                placeholder="例: 新宿区"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                住所
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={editTarget.address}
                  onChange={e => setEditTarget(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="例: 文京区柳町5-33-19"
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!editTarget?.address) { alert("住所を入力してください"); return; }
                    setGeocodingEdit(true);
                    try {
                      const q = encodeURIComponent("東京都" + editTarget.address);
                      const res = await fetch(
                        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${q}`,
                        { signal: AbortSignal.timeout(5000) }
                      );
                      const data = await res.json() as { geometry?: { coordinates?: [number, number] } }[];
                      if (Array.isArray(data) && data.length > 0 && data[0]?.geometry?.coordinates) {
                        const [lng, lat] = data[0].geometry.coordinates;
                        if (!isTokyoCoords(lat, lng)) {
                          alert(`東京都外の座標が返されました（${lat.toFixed(4)}, ${lng.toFixed(4)}）。\n住所を確認してください。`);
                          return;
                        }
                        setEditTarget(prev => prev ? {
                          ...prev,
                          latitude:  String(lat),
                          longitude: String(lng),
                        } : null);
                      } else {
                        alert("座標を取得できませんでした");
                      }
                    } catch {
                      alert("エラーが発生しました");
                    } finally {
                      setGeocodingEdit(false);
                    }
                  }}
                  disabled={geocodingEdit}
                  style={{
                    padding: "8px 12px", borderRadius: 6, fontSize: 13,
                    border: "1px solid #bfdbfe",
                    background: geocodingEdit ? "#e5e7eb" : "#eff6ff",
                    color: geocodingEdit ? "#9ca3af" : "#1d4ed8",
                    cursor: geocodingEdit ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap", fontFamily: "inherit",
                  }}
                >
                  📍 座標取得
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: "bold", color: "#6b7280" }}>
                  緯度・経度
                </label>
                <button
                  type="button"
                  onClick={handleReGeocode}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid #bfdbfe", background: "#eff6ff",
                    cursor: "pointer", color: "#1d4ed8", fontFamily: "inherit",
                  }}
                >
                  📍 エリア＋名称から再取得
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  type="text"
                  value={editTarget.latitude}
                  onChange={e => setEditTarget(prev => prev ? { ...prev, latitude: e.target.value } : null)}
                  placeholder="35.6895"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <input
                  type="text"
                  value={editTarget.longitude}
                  onChange={e => setEditTarget(prev => prev ? { ...prev, longitude: e.target.value } : null)}
                  placeholder="139.6917"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: "bold", color: "#6b7280" }}>
                  キャプション
                </label>
                <button
                  type="button"
                  onClick={autoCaption}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid #d1d5db", background: "#f9fafb",
                    cursor: "pointer", color: "#6b7280", fontFamily: "inherit",
                  }}
                >
                  エリア＋名称で自動生成
                </button>
              </div>
              <input
                type="text"
                value={editTarget.caption}
                onChange={e => setEditTarget(prev => prev ? { ...prev, caption: e.target.value } : null)}
                placeholder="例: 文京区柳町小学校"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#5BAD52", color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "#706e68", marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
