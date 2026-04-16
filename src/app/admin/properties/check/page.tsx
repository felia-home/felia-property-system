"use client";
import { useState, useEffect } from "react";

interface CheckProperty {
  id: string;
  property_type: string;
  city: string;
  town: string | null;
  address: string;
  price: number | null;
  published_hp: boolean;
  published_members: boolean;
  published_suumo: boolean;
  published_athome: boolean;
  published_yahoo: boolean;
  published_homes: boolean;
  seller_company: string | null;
  seller_phone: string | null;
  last_checked_at: string | null;
  check_interval_days: number;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

// DBのcheck_interval_daysに頼らず掲載状況から動的計算
function getIntervalDays(p: CheckProperty): number {
  const hasPortal = p.published_suumo || p.published_athome ||
    p.published_yahoo || p.published_homes;
  return hasPortal ? 7 : 14;
}

function getPriority(p: CheckProperty): number {
  const interval = getIntervalDays(p);
  if (!p.last_checked_at) return 2;
  const days = Math.floor((Date.now() - new Date(p.last_checked_at).getTime()) / 86_400_000);
  if (days >= interval) return 0;
  if (days >= interval - 2) return 1;
  return 3;
}

function getRowStyle(p: CheckProperty): React.CSSProperties {
  const interval = getIntervalDays(p);
  if (!p.last_checked_at) return { backgroundColor: "#fffbeb", borderLeft: "4px solid #f59e0b" };
  const days = Math.floor((Date.now() - new Date(p.last_checked_at).getTime()) / 86_400_000);
  if (days >= interval) return { backgroundColor: "#fef2f2", borderLeft: "4px solid #dc2626" };
  if (days >= interval - 2) return { backgroundColor: "#fff7ed", borderLeft: "4px solid #f97316" };
  return { backgroundColor: "#fff", borderLeft: "4px solid #e5e7eb" };
}

function getStatusText(p: CheckProperty): { text: string; color: string } {
  const interval = getIntervalDays(p);
  if (!p.last_checked_at) return { text: "📋 未確認", color: "#d97706" };
  const days = Math.floor((Date.now() - new Date(p.last_checked_at).getTime()) / 86_400_000);
  const remaining = interval - days;
  if (days >= interval) return { text: `⚠️ ${days - interval + 1}日超過`, color: "#dc2626" };
  if (remaining <= 2) return { text: `⏰ 残り${remaining}日`, color: "#f97316" };
  return { text: `✓ 残り${remaining}日`, color: "#5BAD52" };
}

export default function PropertyCheckPage() {
  const [properties, setProperties] = useState<CheckProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/properties?take=500")
      .then(r => r.json())
      .then((d: { properties?: CheckProperty[] }) => {
        const list = (d.properties ?? []).filter((p) =>
          p.published_hp || p.published_suumo || p.published_athome ||
          p.published_yahoo || p.published_homes || p.published_members
        );
        list.sort((a, b) => getPriority(a) - getPriority(b));
        setProperties(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 価格inputの初期値を現在価格で設定
  useEffect(() => {
    const initialPrices: Record<string, string> = {};
    properties.forEach(p => {
      initialPrices[p.id] = p.price != null ? String(p.price) : "";
    });
    setPriceInputs(initialPrices);
  }, [properties]);

  const handleCheck = async (property: CheckProperty) => {
    setChecking(prev => ({ ...prev, [property.id]: true }));
    const newPriceStr = priceInputs[property.id];
    const newPrice = newPriceStr && newPriceStr !== "" ? parseFloat(newPriceStr) : null;
    try {
      const res = await fetch(`/api/properties/${property.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_price: newPrice, note: null }),
      });
      if (res.ok) {
        setDone(prev => ({ ...prev, [property.id]: true }));
        const updatedPrice = newPrice ?? property.price;
        setProperties(prev => prev.map(p =>
          p.id === property.id
            ? { ...p, last_checked_at: new Date().toISOString(), price: updatedPrice }
            : p
        ));
        if (newPrice != null) {
          setPriceInputs(prev => ({ ...prev, [property.id]: String(updatedPrice ?? "") }));
        }
      } else {
        alert("確認の保存に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setChecking(prev => ({ ...prev, [property.id]: false }));
    }
  };

  // priority 0=超過, 1=まもなく, 2=未確認 → 要確認
  const overdueCount = properties.filter(p => getPriority(p) <= 2).length;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>物件確認リスト</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          掲載中物件の定期確認（ポータル：7日ごと / HPのみ：14日ごと）
        </p>
      </div>

      {/* サマリー */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{
          padding: "12px 20px", borderRadius: 8,
          backgroundColor: overdueCount > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${overdueCount > 0 ? "#fca5a5" : "#bbf7d0"}`,
        }}>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}>要確認</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: overdueCount > 0 ? "#dc2626" : "#5BAD52", margin: 0 }}>
            {overdueCount}件
          </p>
        </div>
        <div style={{ padding: "12px 20px", borderRadius: 8, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}>掲載中合計</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: 0 }}>{properties.length}件</p>
        </div>
      </div>

      {/* 物件一覧 */}
      {properties.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 13 }}>掲載中の物件がありません</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {properties.map(property => {
            const status = getStatusText(property);
            const isChecking = checking[property.id];
            const isDone = done[property.id];
            const typeLabel = TYPE_LABELS[property.property_type] ?? property.property_type;
            const addressLabel = `${typeLabel}｜${property.city}${property.town ?? ""}${property.address}`;

            return (
              <div key={property.id} style={{
                ...getRowStyle(property),
                borderRadius: 8,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                  {/* 物件情報 */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <a href={`/admin/properties/${property.id}`}
                      style={{ fontSize: 14, fontWeight: 700, color: "#111", textDecoration: "none" }}>
                      {addressLabel}
                    </a>
                    <p style={{ fontSize: 15, color: "#5BAD52", fontWeight: 700, margin: "2px 0" }}>
                      {property.price != null ? `${property.price.toLocaleString()}万円` : "価格未入力"}
                    </p>
                    {/* 掲載媒体バッジ */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {property.published_hp && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#dcfce7", color: "#15803d", fontWeight: 600 }}>HP</span>}
                      {property.published_members && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 600 }}>会員</span>}
                      {property.published_suumo && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#f0fdf4", color: "#00a040", fontWeight: 600 }}>SUUMO</span>}
                      {property.published_athome && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#fdf2f8", color: "#e4007f", fontWeight: 600 }}>athome</span>}
                      {property.published_yahoo && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#fff1f2", color: "#be123c", fontWeight: 600 }}>Yahoo</span>}
                      {property.published_homes && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, backgroundColor: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>HOMES</span>}
                    </div>
                  </div>

                  {/* 掲載元 */}
                  <div style={{ minWidth: 160 }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px" }}>掲載元</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
                      {property.seller_company || "—"}
                    </p>
                    {property.seller_phone ? (
                      <a href={`tel:${property.seller_phone}`}
                        style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", display: "block" }}>
                        📞 {property.seller_phone}
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>電話番号未登録</span>
                    )}
                  </div>

                  {/* 確認状況 */}
                  <div style={{ minWidth: 120 }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px" }}>確認状況</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: status.color, margin: 0 }}>
                      {status.text}
                    </p>
                    {property.last_checked_at && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                        {new Date(property.last_checked_at).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>

                  {/* 価格変更 + 確認ボタン */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px" }}>価格変更（万円）</p>
                      <input
                        type="number"
                        value={priceInputs[property.id] ?? ""}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [property.id]: e.target.value }))}
                        style={{
                          width: 110, padding: "6px 10px",
                          border: "1px solid #d1d5db", borderRadius: 6,
                          fontSize: 13, fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleCheck(property)}
                      disabled={isChecking}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: isDone ? "#9ca3af" : isChecking ? "#9ca3af" : "#5BAD52",
                        color: "#fff", border: "none", borderRadius: 6,
                        cursor: isChecking ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 700,
                        whiteSpace: "nowrap", marginTop: 16,
                        fontFamily: "inherit",
                      }}
                    >
                      {isDone ? "✅ 確認済み" : isChecking ? "保存中..." : "✅ 物件確認"}
                    </button>
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
