"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface CompanyForm {
  name: string;
  postal_code: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  hours: string;
  holiday: string;
  license: string;
  access_text: string;
  lat: string;
  lng: string;
}

const EMPTY: CompanyForm = {
  name: "", postal_code: "", address: "", phone: "",
  fax: "", email: "", hours: "", holiday: "", license: "",
  access_text: "", lat: "", lng: "",
};

const FIELDS: { key: keyof CompanyForm; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "name",        label: "会社名",               placeholder: "株式会社フェリアホーム" },
  { key: "postal_code", label: "郵便番号",              placeholder: "000-0000" },
  { key: "address",     label: "住所",                  placeholder: "東京都渋谷区幡ヶ谷2-14-7" },
  { key: "phone",       label: "電話番号",              placeholder: "03-5352-7913" },
  { key: "fax",         label: "FAX番号",               placeholder: "03-XXXX-XXXX" },
  { key: "email",       label: "メールアドレス",        placeholder: "info@felia-home.co.jp" },
  { key: "hours",       label: "営業時間",              placeholder: "10:00〜19:00" },
  { key: "holiday",     label: "定休日",                placeholder: "水曜日・年末年始" },
  { key: "license",     label: "宅建業者免許番号",      placeholder: "東京都知事（X）第XXXXX号" },
  { key: "access_text", label: "アクセス方法",          placeholder: "最寄り駅からの道順...", textarea: true },
  { key: "lat",         label: "緯度（Google Maps用）", placeholder: "35.6773" },
  { key: "lng",         label: "経度（Google Maps用）", placeholder: "139.6858" },
];

export default function CompanySettingsPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  useEffect(() => {
    setCanEdit(["ADMIN", "SENIOR_MANAGER"].includes(
      (session?.user as { permission?: string })?.permission ?? ""
    ));
  }, [session]);

  useEffect(() => {
    fetch("/api/admin/company")
      .then(r => r.json())
      .then((d: { company?: Record<string, unknown> }) => {
        if (d.company) {
          setForm({
            name:        String(d.company.name ?? ""),
            postal_code: String(d.company.postal_code ?? ""),
            address:     String(d.company.address ?? ""),
            phone:       String(d.company.phone ?? ""),
            fax:         String(d.company.fax ?? ""),
            email:       String(d.company.email ?? ""),
            hours:       String(d.company.hours ?? ""),
            holiday:     String(d.company.holiday ?? ""),
            license:     String(d.company.license ?? ""),
            access_text: String(d.company.access_text ?? ""),
            lat:         d.company.lat != null ? String(d.company.lat) : "",
            lng:         d.company.lng != null ? String(d.company.lng) : "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGeocode = async () => {
    if (!form.address) {
      setGeocodeError("住所を入力してください");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(`/api/admin/geocode?address=${encodeURIComponent(form.address)}`);
      const data = await res.json() as { lat?: number; lng?: number };
      if (data.lat && data.lng) {
        setForm(f => ({ ...f, lat: data.lat!.toString(), lng: data.lng!.toString() }));
      } else {
        setGeocodeError("住所から緯度経度を取得できませんでした。「東京都渋谷区〇〇」のように都道府県から入力してください。");
      }
    } catch {
      setGeocodeError("取得に失敗しました");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg({ text: "保存しました", ok: true });
        setTimeout(() => setMsg(null), 3000);
      } else {
        const d = await res.json() as { error?: string };
        setMsg({ text: d.error ?? "保存に失敗しました", ok: false });
      }
    } catch {
      setMsg({ text: "通信エラーが発生しました", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 14, boxSizing: "border-box",
    fontFamily: "inherit", outline: "none",
  };

  if (loading) return <div style={{ padding: 32, color: "#aaa" }}>読み込み中...</div>;

  return (
    <div style={{ padding: "32px", maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          会社情報設定（HP表示用）
        </h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 6, margin: "6px 0 0" }}>
          HPのアクセスページ・問い合わせページ・フッターに表示される会社情報を管理します。
        </p>
      </div>

      {msg && (
        <div style={{
          padding: "10px 16px", marginBottom: 24, borderRadius: 8, fontSize: 13,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#15803d" : "#b91c1c",
          border: `1px solid ${msg.ok ? "#86efac" : "#fca5a5"}`,
        }}>
          {msg.ok ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      <div style={{
        background: "#fff", border: "1px solid #e8e8e8", borderRadius: 16,
        padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FIELDS.map(({ key, label, placeholder, textarea }) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>
                {label}
              </label>
              {textarea ? (
                <textarea
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!canEdit}
                  rows={4}
                  style={{
                    ...inputSt,
                    resize: "vertical",
                    background: canEdit ? "#fff" : "#f9fafb",
                    color: "#111827",
                  }}
                />
              ) : (
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!canEdit}
                  style={{
                    ...inputSt,
                    background: canEdit ? "#fff" : "#f9fafb",
                    color: "#111827",
                  }}
                />
              )}
              {key === "address" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={geocoding || !canEdit}
                      style={{
                        padding: "8px 16px",
                        background: geocoding ? "#9ca3af" : "#3b82f6",
                        color: "#fff", border: "none", borderRadius: 6,
                        cursor: geocoding || !canEdit ? "not-allowed" : "pointer",
                        fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {geocoding ? "取得中..." : "📍 住所から緯度経度を取得"}
                    </button>
                    {form.lat && form.lng && (
                      <span style={{ fontSize: 12, color: "#5BAD52" }}>
                        ✓ {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                      </span>
                    )}
                  </div>
                  {geocodeError && (
                    <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4, margin: "4px 0 0" }}>
                      {geocodeError}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {!canEdit && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
            ※ 編集権限（ADMIN / SENIOR_MANAGER）が必要です
          </div>
        )}

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 24, padding: "10px 28px",
              background: saving ? "#9ca3af" : "#5BAD52",
              color: "#fff", border: "none", borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        )}
      </div>
    </div>
  );
}
