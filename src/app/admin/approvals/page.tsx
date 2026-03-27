"use client";
import { useEffect, useState, useCallback } from "react";

interface Property {
  id: string;
  property_type: string;
  city: string;
  address: string;
  station_name: string;
  station_walk: number;
  price: number;
  rooms: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

export default function ApprovalsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchPending = useCallback(() => {
    setLoading(true);
    fetch("/api/properties?status=PENDING")
      .then((r) => r.json())
      .then((d) => setProperties(d.properties ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        const d = await res.json();
        setError(d.error ?? "承認に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setProcessing(false);
      setConfirmId(null);
    }
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>広告確認待ち</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          掲載前に広告内容を確認し、問題がなければ承認してください
        </p>
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
          <p style={{ color: "#706e68", fontSize: 13 }}>広告確認待ちの物件はありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#e0deda", borderRadius: 12, overflow: "hidden", border: "1px solid #e0deda" }}>
          {properties.map((p, i) => (
            <div key={p.id} style={{ background: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, borderBottom: i < properties.length - 1 ? "1px solid #f3f2ef" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.address}
                </div>
                <div style={{ fontSize: 11, color: "#706e68", marginTop: 3 }}>
                  {p.station_name} 徒歩{p.station_walk}分　{p.price.toLocaleString()}万円
                  {p.rooms ? `　${p.rooms}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#706e68", whiteSpace: "nowrap" }}>
                登録: {new Date(p.created_at).toLocaleDateString("ja-JP")}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`/admin/properties/${p.id}`}
                  style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", textDecoration: "none", color: "#1c1b18" }}>
                  詳細確認
                </a>
                <button onClick={() => setConfirmId(p.id)}
                  style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  承認
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {properties.length > 0 && !loading && (
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 12 }}>{properties.length}件の承認待ち</p>
      )}

      {/* Confirm dialog */}
      {confirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>広告確認を承認</h3>
            <p style={{ fontSize: 13, color: "#706e68", marginBottom: 24, lineHeight: 1.7 }}>
              この物件の広告確認を承認します。<br />
              承認後は掲載設定が可能になります。よろしいですか？
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmId(null)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                キャンセル
              </button>
              <button onClick={() => handleApprove(confirmId)} disabled={processing}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {processing ? "処理中..." : "承認する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
