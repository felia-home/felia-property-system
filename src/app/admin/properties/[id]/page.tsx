"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, propertyToForm, formToBody,
} from "@/components/admin/property-form-tabs";
import PhotoManager from "@/components/admin/photo-manager";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き", REVIEW: "AI確認中", PENDING: "承認待ち",
  APPROVED: "承認済み", PUBLISHED_HP: "HP掲載中",
  PUBLISHED_ALL: "全媒体掲載", SUSPENDED: "一時停止", SOLD: "成約済み",
};
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT:        { bg: "#f3f2ef", color: "#706e68" },
  REVIEW:       { bg: "#fff7cc", color: "#7a5c00" },
  PENDING:      { bg: "#fff0e5", color: "#c05600" },
  APPROVED:     { bg: "#e6f4ea", color: "#1a7737" },
  PUBLISHED_HP: { bg: "#e3f0ff", color: "#1a56a0" },
  PUBLISHED_ALL:{ bg: "#234f35", color: "#fff" },
  SUSPENDED:    { bg: "#f3f2ef", color: "#706e68" },
  SOLD:         { bg: "#fdeaea", color: "#8c1f1f" },
};
const STATUS_ACTIONS: Record<string, { label: string; next: string; danger?: boolean }[]> = {
  DRAFT:        [{ label: "AI確認へ送る", next: "REVIEW" }],
  REVIEW:       [{ label: "承認待ちへ", next: "PENDING" }],
  PENDING:      [{ label: "承認する", next: "APPROVED" }],
  APPROVED:     [
    { label: "HP掲載開始", next: "PUBLISHED_HP" },
    { label: "全媒体掲載", next: "PUBLISHED_ALL" },
  ],
  PUBLISHED_HP: [
    { label: "全媒体掲載へ", next: "PUBLISHED_ALL" },
    { label: "一時停止", next: "SUSPENDED", danger: true },
  ],
  PUBLISHED_ALL:[
    { label: "HP掲載のみに戻す", next: "PUBLISHED_HP" },
    { label: "一時停止", next: "SUSPENDED", danger: true },
  ],
  SUSPENDED:    [
    { label: "掲載再開（HP）", next: "PUBLISHED_HP" },
    { label: "成約確定", next: "SOLD", danger: true },
  ],
};

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [property, setProperty] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [mainTab, setMainTab] = useState<"info" | "photos">("info");
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then(r => r.json())
      .then(d => {
        setProperty(d.property);
        setForm(propertyToForm(d.property ?? {}));
      })
      .catch(() => setError("物件情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "更新に失敗しました"); return; }
      setProperty(data.property);
      setForm(propertyToForm(data.property));
      setEditing(false);
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (next: string, danger?: boolean) => {
    const msg = danger
      ? `「${STATUS_LABELS[next]}」に変更します。よろしいですか？この操作は慎重に行ってください。`
      : `ステータスを「${STATUS_LABELS[next]}」に変更しますか？`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/properties/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (res.ok) { setProperty(data.property); setForm(propertyToForm(data.property)); }
    else setError(data.error ?? "更新に失敗しました");
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!property) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>物件が見つかりません</div>;

  const status = String(property.status ?? "DRAFT");
  const badge = STATUS_BADGE[status] ?? { bg: "#f3f2ef", color: "#706e68" };
  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <div style={{ padding: 28 }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#f7f6f2", borderBottom: "1px solid #e0deda",
        marginBottom: 20, paddingBottom: 14, paddingTop: 4,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <button onClick={() => router.push("/admin/properties")}
            style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ← 物件一覧
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <h1 style={{ fontSize: 18, fontWeight: 500 }}>
              {String(property.city ?? "")} {String(property.address ?? "")}
            </h1>
            <span style={{ background: badge.bg, color: badge.color, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* Status action buttons */}
          {actions.map(a => (
            <button key={a.next} onClick={() => handleStatusChange(a.next, a.danger)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: a.danger ? "#8c1f1f" : "#234f35", color: "#fff",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
              {a.label}
            </button>
          ))}
          {/* Edit / Save / Cancel */}
          {!editing ? (
            <button onClick={() => setEditing(true)}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              編集
            </button>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setForm(propertyToForm(property)); setError(""); }}
                style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "保存中..." : "保存する"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Main tab switcher: 物件情報 / 写真管理 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["info", "photos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            style={{
              padding: "8px 20px", fontSize: 13, borderRadius: 8,
              border: "1px solid " + (mainTab === t ? "#234f35" : "#e0deda"),
              background: mainTab === t ? "#234f35" : "#fff",
              color: mainTab === t ? "#fff" : "#706e68",
              fontWeight: mainTab === t ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t === "info" ? "物件情報" : "写真管理"}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        {mainTab === "info" ? (
          <PropertyFormTabs tab={tab} setTab={setTab} form={form} setForm={setForm} />
        ) : (
          <PhotoManager
            propertyId={params.id}
            lat={property.latitude as number | null}
            lng={property.longitude as number | null}
            propertyType={String(property.property_type ?? "")}
          />
        )}
      </div>
    </div>
  );
}
