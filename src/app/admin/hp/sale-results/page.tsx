"use client";
import { useEffect, useRef, useState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";

// Google Maps の型は @types/google.maps 未導入のため最小限の宣言
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.maps) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.dataset.googleMaps = "1";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface Staff {
  id: string;
  name: string;
  photo_url: string | null;
}

interface SaleResult {
  id: string;
  year_month: string;
  area: string;
  property_type: string;
  comment: string | null;
  image_url_1: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  is_active: boolean;
  sort_order: number;
  sale_year: number | null;
  sale_month: number | null;
  area_ward: string | null;
  area_town: string | null;
  floor_plan_image_url: string | null;
  staff_id: string | null;
  staff: Staff | null;
  latitude: number | null;
  longitude: number | null;
}

const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();

const EMPTY_FORM = {
  sale_year: THIS_YEAR,
  sale_month: NOW.getMonth() + 1,
  area_ward: "",
  area_town: "",
  property_type: "戸建て",
  floor_plan_image_url: "",
  image_url_1: "",
  image_url_2: "",
  image_url_3: "",
  staff_id: "",
  comment: "",
  sort_order: 0,
  is_active: true,
};

type FormState = typeof EMPTY_FORM;

const PROPERTY_TYPES = ["土地", "戸建て", "マンション", "その他"];

const inputSt: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit",
};
const labelSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4,
};

function displayPeriod(item: SaleResult): string {
  if (item.sale_year && item.sale_month) return `${item.sale_year}年${item.sale_month}月`;
  if (item.year_month) return item.year_month;
  return "—";
}

function displayArea(item: SaleResult): string {
  const ward = item.area_ward ?? item.area ?? "";
  const town = item.area_town ?? "";
  return [ward, town].filter(Boolean).join(" ");
}

export default function SaleResultsPage() {
  const [items, setItems] = useState<SaleResult[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SaleResult | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 地図表示・ジオコーディング
  const [showMap, setShowMap] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{
    success: number; failed: number; total: number;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/sale-results");
    const d = await r.json() as { results: SaleResult[] };
    setItems(d.results ?? []);
    setLoading(false);
  };

  const loadStaff = async () => {
    const r = await fetch("/api/staff");
    const d = await r.json() as { staff?: Staff[] };
    setStaffList(d.staff ?? []);
  };

  useEffect(() => { void load(); }, []);

  const f = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const openAdd = async () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMsg(null);
    await loadStaff();
    setShowModal(true);
  };

  const openEdit = async (item: SaleResult) => {
    setEditing(item);
    setForm({
      sale_year: item.sale_year ?? THIS_YEAR,
      sale_month: item.sale_month ?? (NOW.getMonth() + 1),
      area_ward: item.area_ward ?? item.area ?? "",
      area_town: item.area_town ?? "",
      property_type: item.property_type,
      floor_plan_image_url: item.floor_plan_image_url ?? "",
      image_url_1: item.image_url_1 ?? "",
      image_url_2: item.image_url_2 ?? "",
      image_url_3: item.image_url_3 ?? "",
      staff_id: item.staff_id ?? "",
      comment: item.comment ?? "",
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setMsg(null);
    await loadStaff();
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.area_ward.trim()) {
      setMsg({ text: "区を入力してください", ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const url = editing ? `/api/admin/sale-results/${editing.id}` : "/api/admin/sale-results";
      const method = editing ? "PATCH" : "POST";
      const payload = {
        sale_year: form.sale_year,
        sale_month: form.sale_month,
        year_month: `${form.sale_year}-${String(form.sale_month).padStart(2, "0")}`,
        area: form.area_ward,
        area_ward: form.area_ward || null,
        area_town: form.area_town || null,
        property_type: form.property_type,
        floor_plan_image_url: form.floor_plan_image_url || null,
        image_url_1: form.image_url_1 || null,
        image_url_2: form.image_url_2 || null,
        image_url_3: form.image_url_3 || null,
        staff_id: form.staff_id || null,
        comment: form.comment || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        await load();
      } else {
        const d = await res.json() as { error?: string };
        setMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: SaleResult) => {
    await fetch(`/api/admin/sale-results/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/sale-results/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  // 地図初期化
  const initMap = async (saleResults: SaleResult[]) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    try {
      await loadGoogleMaps(apiKey);
    } catch (e) {
      console.error("Google Maps の読み込みに失敗:", e);
      return;
    }
    if (!window.google?.maps) return;

    const g = window.google;
    mapInstance.current = new g.maps.Map(mapRef.current, {
      center: { lat: 35.689, lng: 139.692 },
      zoom: 11,
    });

    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    const withCoords = saleResults.filter(r => r.latitude != null && r.longitude != null);

    withCoords.forEach(r => {
      const marker = new g.maps.Marker({
        position: { lat: r.latitude!, lng: r.longitude! },
        map: mapInstance.current,
        title: `${r.area_ward ?? r.area}${r.area_town ?? ""} ${r.property_type}`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#5BAD52",
          fillOpacity: 0.9,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="padding:8px;font-size:13px;min-width:160px;">
            <div style="font-weight:bold;color:#374151;">${(r.area_ward ?? r.area) ?? ""}${r.area_town ?? ""}</div>
            <div style="color:#6b7280;margin-top:4px;">${r.property_type} | ${displayPeriod(r)}</div>
            ${r.comment ? `<div style="margin-top:6px;font-size:12px;color:#374151;">${r.comment.slice(0, 60)}${r.comment.length > 60 ? "..." : ""}</div>` : ""}
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markers.current.push(marker);
    });
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/sale-results/geocode", { method: "POST" });
      const data = await res.json();
      setGeocodeResult(data);
      await load();
    } finally {
      setGeocoding(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>売却実績管理</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4, margin: "4px 0 0" }}>HPに掲載する売却実績を管理します。</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setShowMap(v => {
                if (!v) setTimeout(() => initMap(items), 100);
                return !v;
              });
            }}
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #d1d5db",
              background: showMap ? "#5BAD52" : "#fff",
              color: showMap ? "#fff" : "#374151",
              fontWeight: "bold", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🗺️ {showMap ? "地図を閉じる" : "地図で見る"}
          </button>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding}
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 13,
              border: "1px solid #bfdbfe", background: "#eff6ff",
              color: "#1d4ed8", fontWeight: "bold",
              cursor: geocoding ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            {geocoding ? "取得中..." : "📍 住所から座標取得"}
          </button>
          {geocodeResult && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              ✅ {geocodeResult.success}件取得 / {geocodeResult.failed}件失敗
            </span>
          )}
          <button onClick={openAdd} style={{
            padding: "10px 20px", background: "#5BAD52", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
          }}>
            + 新規追加
          </button>
        </div>
      </div>

      {/* 地図エリア */}
      {showMap && (
        <div style={{
          marginBottom: 20, border: "1px solid #e5e7eb",
          borderRadius: 8, overflow: "hidden",
        }}>
          <div ref={mapRef} style={{ width: "100%", height: 500 }} />
          <div style={{
            padding: "8px 12px", background: "#f9fafb",
            fontSize: 12, color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
          }}>
            📍 {items.filter(r => r.latitude != null).length}件の売却実績を表示中
            （座標未取得: {items.filter(r => r.latitude == null).length}件）
          </div>
        </div>
      )}

      {/* 一覧テーブル */}
      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", background: "#f9fafb", borderRadius: 12 }}>
          売却実績がまだありません
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e8e8e8" }}>
                {["売却時期", "場所", "物件種別", "担当営業", "公開", "操作"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#6b7280", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: item.is_active ? 1 : 0.55 }}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {displayPeriod(item)}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{displayArea(item)}</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                      {item.property_type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    {item.staff ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {item.staff.photo_url && (
                          <img src={item.staff.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                        )}
                        <span>{item.staff.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: "#aaa" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => handleToggle(item)} style={{
                      padding: "4px 12px", border: "none", borderRadius: 6, cursor: "pointer",
                      fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                      background: item.is_active ? "#dcfce7" : "#f3f4f6",
                      color: item.is_active ? "#15803d" : "#6b7280",
                    }}>
                      {item.is_active ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(item)} style={{
                        padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, background: "#fff", fontFamily: "inherit",
                      }}>編集</button>
                      <button onClick={() => setDeleteId(item.id)} style={{
                        padding: "4px 12px", border: "1px solid #fca5a5", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, color: "#b91c1c", background: "#fff", fontFamily: "inherit",
                      }}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 追加・編集モーダル */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 580,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {editing ? "売却実績を編集" : "売却実績を追加"}
            </h2>

            {msg && (
              <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, fontSize: 13, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {msg.text}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 売却時期 */}
              <div>
                <label style={labelSt}>売却時期 *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={form.sale_year} onChange={e => f("sale_year", Number(e.target.value))}
                    style={{ ...inputSt, flex: 1, appearance: "none", background: "white" }}>
                    {Array.from({ length: 10 }, (_, i) => THIS_YEAR - i).map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                  <select value={form.sale_month} onChange={e => f("sale_month", Number(e.target.value))}
                    style={{ ...inputSt, flex: 1, appearance: "none", background: "white" }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* エリア */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelSt}>区 *</label>
                  <input value={form.area_ward} onChange={e => f("area_ward", e.target.value)}
                    placeholder="例：渋谷区" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>町名</label>
                  <input value={form.area_town} onChange={e => f("area_town", e.target.value)}
                    placeholder="例：千駄ヶ谷" style={inputSt} />
                </div>
              </div>

              {/* 物件種別 */}
              <div>
                <label style={labelSt}>物件種別 *</label>
                <select value={form.property_type} onChange={e => f("property_type", e.target.value)}
                  style={{ ...inputSt, appearance: "none", background: "white" }}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* 間取り図画像 */}
              <div>
                <label style={labelSt}>間取り図画像</label>
                <ImageUploader
                  folder="sale-results"
                  currentUrl={form.floor_plan_image_url || undefined}
                  label="間取り図画像をアップロード"
                  onUpload={url => f("floor_plan_image_url", url)}
                />
              </div>

              {/* 物件画像1〜3 */}
              {(["image_url_1", "image_url_2", "image_url_3"] as const).map((key, i) => (
                <div key={key}>
                  <label style={labelSt}>物件画像{i + 1}</label>
                  <ImageUploader
                    folder="sale-results"
                    currentUrl={form[key] || undefined}
                    onUpload={url => f(key, url)}
                  />
                </div>
              ))}

              {/* 担当営業 */}
              <div>
                <label style={labelSt}>担当営業</label>
                <select value={form.staff_id} onChange={e => f("staff_id", e.target.value)}
                  style={{ ...inputSt, appearance: "none", background: "white" }}>
                  <option value="">担当者なし</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* コメント */}
              <div>
                <label style={labelSt}>コメント</label>
                <textarea value={form.comment} onChange={e => f("comment", e.target.value)}
                  rows={3} placeholder="売却に関するコメント..." style={{ ...inputSt, resize: "vertical" }} />
              </div>

              {/* 表示順・公開フラグ */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelSt}>表示順</label>
                  <input type="number" value={form.sort_order}
                    onChange={e => f("sort_order", Number(e.target.value))}
                    style={inputSt} />
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => f("is_active", e.target.checked)} />
                    表示ON
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setMsg(null); }} style={{
                padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: 8,
                cursor: "pointer", fontSize: 14, background: "#fff", fontFamily: "inherit",
              }}>キャンセル</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", background: saving ? "#9ca3af" : "#5BAD52",
                color: "#fff", border: "none", borderRadius: 8,
                cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 360 }}>
            <p style={{ fontSize: 15, marginBottom: 20 }}>この売却実績を削除しますか？</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{
                padding: "8px 20px", border: "1px solid #d1d5db", borderRadius: 8,
                cursor: "pointer", fontSize: 14, background: "#fff", fontFamily: "inherit",
              }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                padding: "8px 20px", background: "#dc2626", color: "#fff",
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit",
              }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
