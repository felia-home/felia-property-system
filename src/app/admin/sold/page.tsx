"use client";
import { useEffect, useState } from "react";

interface Property {
  id: string;
  property_type: string;
  status: string;
  city: string;
  address: string;
  station_name: string;
  station_walk: number;
  price: number;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "承認済み", PUBLISHED_HP: "HP掲載中",
  PUBLISHED_ALL: "全媒体掲載", SUSPENDED: "一時停止",
};

function calcAlertScore(p: Property): { score: number; signals: string[] } {
  const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86_400_000);
  const signals: string[] = [];
  let score = 0;

  if (p.status === "SUSPENDED") { score += 40; signals.push("一時停止中（+40点）"); }
  if (days >= 90) { score += 40; signals.push(`掲載${days}日（90日超 +40点）`); }
  else if (days >= 60) { score += 20; signals.push(`掲載${days}日（60日超 +20点）`); }

  return { score, signals };
}

export default function SoldAlertsPage() {
  const [properties, setProperties] = useState<(Property & { score: number; signals: string[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => {
        const all: Property[] = d.properties ?? [];
        const alerts = all
          .filter((p) => p.status !== "DRAFT" && p.status !== "SOLD")
          .map((p) => ({ ...p, ...calcAlertScore(p) }))
          .filter((p) => p.score >= 40)
          .sort((a, b) => b.score - a.score);
        setProperties(alerts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConfirmSold = async (id: string) => {
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SOLD" }),
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        const d = await res.json();
        setError(d.error ?? "処理に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setProcessing(false);
      setConfirmId(null);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "#8c1f1f" : score >= 60 ? "#c05600" : "#7a5c00";

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>成約アラート</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          成約の可能性が高い物件を自動検知しています。担当者が確認して処理してください
        </p>
      </div>

      <div style={{ background: "#fff8f0", border: "1px solid #f0dcc0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#7a5000" }}>
        スコア40点以上の物件を表示。成約確定は必ず担当者が確認のうえ実行してください。
      </div>

      {error && (
        <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#706e68", fontSize: 13 }}>読み込み中...</p>
      ) : properties.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "#706e68", fontSize: 13 }}>成約アラートの物件はありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {properties.map((p) => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Score */}
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(p.score), lineHeight: 1 }}>{p.score}</div>
                  <div style={{ fontSize: 10, color: "#706e68", marginTop: 2 }}>点</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.address}
                    </span>
                    <span style={{ fontSize: 11, color: "#706e68" }}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#706e68", marginBottom: 8 }}>
                    {p.station_name} 徒歩{p.station_walk}分　{p.price.toLocaleString()}万円
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.signals.map((s) => (
                      <span key={s} style={{ fontSize: 10, background: "#fff8f0", color: "#7a5000", border: "1px solid #f0dcc0", padding: "2px 8px", borderRadius: 99 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a href={`/admin/properties/${p.id}`}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", textDecoration: "none", color: "#1c1b18" }}>
                    詳細
                  </a>
                  <button onClick={() => setConfirmId(p.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#8c1f1f", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    成約確定
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>成約を確定</h3>
            <p style={{ fontSize: 13, color: "#706e68", marginBottom: 8, lineHeight: 1.7 }}>
              この物件の成約を確定します。
            </p>
            <p style={{ fontSize: 13, color: "#8c1f1f", marginBottom: 24, lineHeight: 1.7, fontWeight: 500 }}>
              確定後はすべての掲載が終了し、ステータスが「成約済み」に変更されます。この操作は取り消せません。
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                キャンセル
              </button>
              <button onClick={() => handleConfirmSold(confirmId)} disabled={processing}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#8c1f1f", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {processing ? "処理中..." : "成約確定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
