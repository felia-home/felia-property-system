"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================
// Types
// ============================================================

export interface PropertyImage {
  id: string;
  url: string;
  filename: string;
  order: number;
  room_type: string | null;
  caption: string | null;
  ai_caption: string | null;
  ai_pr_text: string | null;
  ai_confidence: number | null;
  ai_analyzed_at: string | null;
  is_main: boolean;
}

interface UploadingFile {
  id: string;       // temp client id
  name: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING: "リビング",
  KITCHEN: "キッチン",
  BEDROOM: "洋室・寝室",
  BATHROOM: "浴室",
  TOILET: "トイレ",
  ENTRANCE: "玄関",
  EXTERIOR: "外観",
  FLOOR_PLAN: "間取図",
  BALCONY: "バルコニー",
  GARDEN: "庭・外構",
  PARKING: "駐車場",
  OTHER: "その他",
};

const CONFIDENCE_COLOR = (c: number | null) => {
  if (c == null) return "#706e68";
  if (c >= 0.8) return "#1a7737";
  if (c >= 0.5) return "#8a5200";
  return "#8c1f1f";
};

// ============================================================
// Mansion autocomplete
// ============================================================

interface MansionSuggestion {
  id: string;
  name: string;
  city: string | null;
  exterior_images: Array<{ url: string; is_primary: boolean }>;
}

function MansionAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (m: MansionSuggestion | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<MansionSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/mansions?name=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSuggestions(data.mansions ?? []);
    setOpen(true);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 300);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="マンション名を入力..."
        style={{
          width: "100%", padding: "7px 10px", border: "1px solid #e0deda",
          borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid #e0deda", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,.1)", maxHeight: 260, overflowY: "auto",
        }}>
          {suggestions.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.name); onSelect(m); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "9px 12px",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                borderBottom: "1px solid #f2f1ed",
              }}
            >
              {m.exterior_images[0] && (
                <img src={m.exterior_images[0].url} alt="" style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4 }} />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                {m.city && <div style={{ fontSize: 11, color: "#706e68" }}>{m.city}</div>}
              </div>
            </button>
          ))}
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            style={{
              width: "100%", textAlign: "left", padding: "9px 12px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#234f35", fontFamily: "inherit",
            }}
          >
            ＋ 「{value}」を新しいマンションとして登録
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Environment photo suggestions
// ============================================================

interface EnvImage {
  id: string;
  url: string;
  facility_type: string;
  facility_name: string | null;
  ai_caption: string | null;
}

function EnvironmentSuggestions({
  propertyId,
  lat,
  lng,
  onUse,
  linkedIds,
}: {
  propertyId: string;
  lat: number | null;
  lng: number | null;
  onUse: (img: EnvImage) => void;
  linkedIds: Set<string>;
}) {
  const [images, setImages] = useState<EnvImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (lat != null) params.set("lat", String(lat));
    if (lng != null) params.set("lng", String(lng));
    params.set("radius", "1200");
    const res = await fetch(`/api/environment-images?${params}`);
    const data = await res.json();
    setImages(data.images ?? []);
    setLoaded(true);
    setLoading(false);
  };

  if (!lat || !lng) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#706e68" }}>周辺環境写真のサジェスト（1200m以内）</span>
        {!loaded && (
          <button onClick={load} disabled={loading}
            style={{ fontSize: 11, padding: "3px 10px", border: "1px solid #e0deda", borderRadius: 6, background: "#f7f6f2", cursor: "pointer", fontFamily: "inherit" }}>
            {loading ? "検索中..." : "周辺写真を検索"}
          </button>
        )}
      </div>
      {loaded && images.length === 0 && (
        <p style={{ fontSize: 12, color: "#706e68" }}>周辺1200m以内の環境写真はありません</p>
      )}
      {loaded && images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: "relative", width: 100 }}>
              <img src={img.url} alt={img.ai_caption ?? ""} style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 6 }} />
              <div style={{ fontSize: 10, color: "#706e68", marginTop: 2, lineHeight: 1.3 }}>
                {ROOM_TYPE_LABELS[img.facility_type] ?? img.facility_type}
                {img.facility_name && ` · ${img.facility_name}`}
              </div>
              <button
                type="button"
                onClick={() => onUse(img)}
                disabled={linkedIds.has(img.id)}
                style={{
                  marginTop: 3, width: "100%", fontSize: 10, padding: "2px 0",
                  border: linkedIds.has(img.id) ? "1px solid #d1d5db" : "1px solid #234f35",
                  borderRadius: 4,
                  background: linkedIds.has(img.id) ? "#f3f4f6" : "#fff",
                  color: linkedIds.has(img.id) ? "#9ca3af" : "#234f35",
                  cursor: linkedIds.has(img.id) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {linkedIds.has(img.id) ? "✅ 登録済み" : "この写真を使用"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main PhotoManager component
// ============================================================

export default function PhotoManager({
  propertyId,
  lat,
  lng,
  propertyType,
}: {
  propertyId: string;
  lat?: number | null;
  lng?: number | null;
  propertyType?: string;
}) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ analyzed: number; errors: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editRoomType, setEditRoomType] = useState<string>("");
  const [mansionName, setMansionName] = useState("");
  const [mansionSelected, setMansionSelected] = useState<MansionSuggestion | null>(null);
  const [linkedEnvImageIds, setLinkedEnvImageIds] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const isMansion = propertyType === "MANSION" || propertyType === "NEW_MANSION";

  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const loadImages = useCallback(async () => {
    const res = await fetch(`/api/properties/${propertyId}/images`);
    const data = await res.json();
    setImages(data.images ?? []);
  }, [propertyId]);

  useEffect(() => { loadImages(); }, [loadImages]);

  // ---- Upload via XHR (for progress events) ----
  const uploadFiles = (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArr.length) return;

    const formData = new FormData();
    fileArr.forEach((f) => formData.append("files", f));

    const tempId = `upload_${Date.now()}`;
    setUploading((prev) => [...prev, ...fileArr.map((f, i) => ({
      id: `${tempId}_${i}`,
      name: f.name,
      progress: 0,
      status: "uploading" as const,
    }))]);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setUploading((prev) =>
        prev.map((u) => u.id.startsWith(tempId) ? { ...u, progress: pct } : u)
      );
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploading((prev) =>
          prev.map((u) => u.id.startsWith(tempId) ? { ...u, progress: 100, status: "done" } : u)
        );
        loadImages();
        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => !u.id.startsWith(tempId)));
        }, 1500);
      } else {
        setUploading((prev) =>
          prev.map((u) => u.id.startsWith(tempId) ? { ...u, status: "error", error: "アップロード失敗" } : u)
        );
      }
    });
    xhr.addEventListener("error", () => {
      setUploading((prev) =>
        prev.map((u) => u.id.startsWith(tempId) ? { ...u, status: "error", error: "通信エラー" } : u)
      );
    });
    xhr.open("POST", `/api/properties/${propertyId}/images`);
    xhr.send(formData);
  };

  // ---- Drag & Drop zone ----
  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  // ---- Reorder drag & drop ----
  const handleImageDragStart = (index: number) => setDragIndex(index);
  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleImageDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) { setDragIndex(null); setDragOverIndex(null); return; }

    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withOrder = reordered.map((img, i) => ({ ...img, order: i }));
    setImages(withOrder);
    setDragIndex(null);
    setDragOverIndex(null);

    // Persist all changed orders
    await Promise.all(
      withOrder.map((img, i) =>
        fetch(`/api/properties/${propertyId}/images/${img.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: i }),
        })
      )
    );
  };

  // ---- Set main photo ----
  const setMain = async (imgId: string) => {
    await fetch(`/api/properties/${propertyId}/images/${imgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_main: true }),
    });
    setImages((prev) => prev.map((img) => ({ ...img, is_main: img.id === imgId })));
  };

  // ---- Delete ----
  const deleteImage = async (imgId: string) => {
    if (!confirm("この写真を削除しますか？")) return;
    await fetch(`/api/properties/${propertyId}/images/${imgId}`, { method: "DELETE" });
    setImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  // ---- Caption + room_type save ----
  const saveCaption = async (imgId: string) => {
    const body: Record<string, string> = { caption: editCaption };
    if (editRoomType) body.room_type = editRoomType;
    await fetch(`/api/properties/${propertyId}/images/${imgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setImages((prev) => prev.map((img) =>
      img.id === imgId
        ? { ...img, caption: editCaption, room_type: editRoomType || img.room_type }
        : img
    ));
    setEditingId(null);
  };

  // ---- AI bulk analyze ----
  const analyzeAll = async () => {
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/images/analyze`, { method: "POST" });
      const data = await res.json();
      setAnalyzeResult({ analyzed: data.analyzed ?? 0, errors: data.errors ?? 0 });
      await loadImages();
    } catch {
      setAnalyzeResult({ analyzed: 0, errors: 1 });
    }
    setAnalyzing(false);
  };

  const unanalyzed = images.filter((img) => !img.ai_analyzed_at).length;

  return (
    <div>
      {/* ---- マンション名入力（マンション物件のみ） ---- */}
      {isMansion && (
        <div style={{ marginBottom: 20, padding: 16, background: "#f7f6f2", borderRadius: 10, border: "1px solid #e0deda" }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>マンション名（外観写真を自動ロード）</div>
          <MansionAutocomplete
            value={mansionName}
            onChange={setMansionName}
            onSelect={(m) => {
              setMansionSelected(m);
              if (m?.exterior_images?.length) {
                // Pre-fill exterior image note
              }
            }}
          />
          {mansionSelected && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#234f35" }}>
              ✓ {mansionSelected.name} を選択中
              {mansionSelected.exterior_images[0] && (
                <img
                  src={mansionSelected.exterior_images[0].url}
                  alt="外観"
                  style={{ display: "block", marginTop: 6, width: 120, height: 80, objectFit: "cover", borderRadius: 6 }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Upload drop zone ---- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropZone}
        onClick={() => fileInput.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#234f35" : "#d0cec8"}`,
          borderRadius: 12,
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#f0f7f2" : "#fafaf8",
          transition: "border-color .15s, background .15s",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1c1b18" }}>
          {isIOS ? "タップして写真を選択" : "ここにファイルをドロップ、またはクリックして選択"}
        </div>
        <div style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          JPEG / PNG / WebP · 複数ファイル同時選択可
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* ---- Upload progress bars ---- */}
      {uploading.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {uploading.map((u) => (
            <div key={u.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: u.status === "error" ? "#8c1f1f" : "#1c1b18" }}>
                  {u.status === "done" ? "✓ " : u.status === "error" ? "✗ " : ""}{u.name}
                </span>
                <span style={{ color: "#706e68" }}>{u.status === "uploading" ? `${u.progress}%` : u.status === "done" ? "完了" : "エラー"}</span>
              </div>
              <div style={{ height: 4, background: "#e0deda", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${u.progress}%`,
                  background: u.status === "error" ? "#8c1f1f" : u.status === "done" ? "#234f35" : "#4a8a60",
                  transition: "width .2s",
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- AI analysis bar ---- */}
      {images.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          padding: "10px 14px", background: "#f7f6f2", borderRadius: 8,
        }}>
          <span style={{ fontSize: 12, flex: 1, color: "#706e68" }}>
            {unanalyzed > 0
              ? `${unanalyzed}枚が未分析`
              : "全写真分析済み"}
          </span>
          {analyzeResult && (
            <span style={{ fontSize: 12, color: analyzeResult.errors > 0 ? "#8c1f1f" : "#1a7737" }}>
              {analyzeResult.analyzed}枚分析完了{analyzeResult.errors > 0 ? ` (エラー${analyzeResult.errors}件)` : ""}
            </span>
          )}
          <button
            onClick={analyzeAll}
            disabled={analyzing || unanalyzed === 0}
            style={{
              padding: "6px 14px", fontSize: 12, borderRadius: 7, border: "none",
              background: analyzing || unanalyzed === 0 ? "#d0cec8" : "#234f35",
              color: analyzing || unanalyzed === 0 ? "#706e68" : "#fff",
              cursor: analyzing || unanalyzed === 0 ? "default" : "pointer",
              fontFamily: "inherit", fontWeight: 500,
            }}
          >
            {analyzing ? "⏳ AI分析中..." : "🤖 AI一括分析"}
          </button>
        </div>
      )}

      {/* ---- Image grid ---- */}
      {images.length === 0 && uploading.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#706e68", fontSize: 13 }}>
          まだ写真がありません。上のエリアからアップロードしてください。
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {images.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => handleImageDragStart(index)}
            onDragOver={(e) => handleImageDragOver(e, index)}
            onDrop={(e) => handleImageDrop(e, index)}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            style={{
              border: `2px solid ${img.is_main ? "#234f35" : dragOverIndex === index ? "#4a8a60" : "#e0deda"}`,
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff",
              opacity: dragIndex === index ? 0.5 : 1,
              cursor: "grab",
              transition: "border-color .1s",
            }}
          >
            {/* Thumbnail */}
            <div style={{ position: "relative" }}>
              <img
                src={img.url}
                alt={img.caption ?? img.ai_caption ?? ""}
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
              />
              {/* Badges */}
              <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {img.is_main && (
                  <span style={{ background: "#234f35", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                    メイン
                  </span>
                )}
                {img.room_type && (
                  <span style={{ background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 10 }}>
                    {ROOM_TYPE_LABELS[img.room_type] ?? img.room_type}
                  </span>
                )}
              </div>
              {/* AI analyzing spinner */}
              {!img.ai_analyzed_at && (
                <div style={{
                  position: "absolute", bottom: 6, right: 6,
                  background: "rgba(0,0,0,.6)", color: "#fff",
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                }}>
                  未分析
                </div>
              )}
              {/* Order badge */}
              <div style={{
                position: "absolute", top: 6, right: 6,
                background: "rgba(0,0,0,.45)", color: "#fff",
                fontSize: 10, padding: "2px 7px", borderRadius: 10,
              }}>
                {index + 1}
              </div>
            </div>

            {/* AI caption / PR text */}
            <div style={{ padding: "8px 10px" }}>
              {img.ai_analyzed_at ? (
                <>
                  {img.ai_caption && (
                    <div style={{ fontSize: 11, color: "#1c1b18", fontWeight: 500, marginBottom: 2 }}>
                      {img.ai_caption}
                    </div>
                  )}
                  {img.ai_pr_text && (
                    <div style={{ fontSize: 10, color: "#706e68", lineHeight: 1.5, marginBottom: 4 }}>
                      {img.ai_pr_text}
                    </div>
                  )}
                  {img.ai_confidence != null && (
                    <div style={{ fontSize: 10, color: CONFIDENCE_COLOR(img.ai_confidence) }}>
                      精度 {Math.round(img.ai_confidence * 100)}%
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#b0ae9c" }}>AI分析待ち</div>
              )}

              {/* User caption edit */}
              {editingId === img.id ? (
                <div style={{ marginTop: 6 }}>
                  <select
                    value={editRoomType}
                    onChange={(e) => setEditRoomType(e.target.value)}
                    style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #e0deda", borderRadius: 5, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 4 }}
                  >
                    <option value="">タグ未設定</option>
                    {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="キャプション..."
                    style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #e0deda", borderRadius: 5, fontFamily: "inherit", boxSizing: "border-box" }}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <button onClick={() => saveCaption(img.id)} style={btnStyle("#234f35", "#fff")}>保存</button>
                    <button onClick={() => setEditingId(null)} style={btnStyle("#f3f2ef", "#706e68")}>取消</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 11, color: img.caption ? "#1c1b18" : img.ai_caption ? "#6b7280" : "#b0ae9c" }}>
                  {img.caption ?? img.ai_caption ?? "キャプションなし"}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              borderTop: "1px solid #f2f1ed", padding: "6px 10px",
              display: "flex", gap: 4, flexWrap: "wrap",
            }}>
              {!img.is_main && (
                <button onClick={() => setMain(img.id)} style={btnStyle("#f0f7f2", "#234f35", "11px")}>
                  メインに設定
                </button>
              )}
              <button onClick={() => { setEditingId(img.id); setEditCaption(img.caption ?? ""); setEditRoomType(img.room_type ?? ""); }}
                style={btnStyle("#f7f6f2", "#706e68", "11px")}>
                編集
              </button>
              <button onClick={() => deleteImage(img.id)} style={btnStyle("#fdeaea", "#8c1f1f", "11px")}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Environment photo suggestions ---- */}
      <EnvironmentSuggestions
        propertyId={propertyId}
        lat={lat ?? null}
        lng={lng ?? null}
        linkedIds={linkedEnvImageIds}
        onUse={async (img) => {
          // 周辺環境写真を物件にリンク（既存 EnvironmentImage の URL で env-images JSON POST）
          try {
            const res = await fetch(`/api/properties/${propertyId}/env-images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url:           img.url,
                facility_name: img.facility_name ?? "",
                facility_type: img.facility_type ?? "OTHER",
              }),
            });
            if (res.ok) {
              setLinkedEnvImageIds(prev => new Set(prev).add(img.id));
            } else {
              const data = await res.json().catch(() => ({}));
              alert("登録に失敗しました: " + (data.error ?? res.statusText));
            }
          } catch {
            alert("エラーが発生しました");
          }
        }}
      />
    </div>
  );
}

function btnStyle(bg: string, color: string, fontSize = "12px") {
  return {
    padding: "3px 9px", fontSize, border: "none", borderRadius: 5,
    background: bg, color, cursor: "pointer", fontFamily: "inherit",
  } as React.CSSProperties;
}
