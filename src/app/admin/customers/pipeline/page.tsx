"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const PIPELINE_STAGES = [
  { status: "NEW",         label: "新規問合せ", color: "#6b7280", bg: "#f9fafb" },
  { status: "CONTACTING",  label: "連絡中",     color: "#3b82f6", bg: "#eff6ff" },
  { status: "VISITING",    label: "内見調整中", color: "#f59e0b", bg: "#fffbeb" },
  { status: "NEGOTIATING", label: "商談中",     color: "#ef4444", bg: "#fef2f2" },
  { status: "CONTRACT",    label: "契約済み",   color: "#8b5cf6", bg: "#faf5ff" },
  { status: "PENDING",     label: "保留",       color: "#06b6d4", bg: "#ecfeff" },
];

interface Customer {
  id: string;
  name: string;
  status: string;
  priority: string;
  ai_score: number | null;
  desired_budget_max: number | null;
  desired_areas: string[];
  last_contact_at: string | null;
  next_contact_at: string | null;
  assigned_staff: { id: string; name: string } | null;
}

export default function PipelinePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(false);
  const [storeId, setStoreId]     = useState("");
  const [stores, setStores]       = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then(r => r.json())
      .then(d => setStores([{ id: "", name: "全店舗" }, ...(d.branches ?? [])]))
      .catch(() => setStores([{ id: "", name: "全店舗" }]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "500",
      ...(storeId ? { store_id: storeId } : {}),
    });
    fetch(`/api/customers?${params}`)
      .then(r => r.json())
      .then(d => {
        setCustomers(d.customers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId]);

  const getByStatus = (status: string) =>
    customers.filter(c => c.status === status);

  const daysSince = (d: string | null) => {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  };

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>🗂️ 顧客パイプライン</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            ステータス別に顧客の状況を一覧表示します
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={storeId}
            onChange={e => setStoreId(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>読み込み中...</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(200px, 1fr))`,
          gap: 12,
          overflowX: "auto",
          minWidth: 0,
        }}>
          {PIPELINE_STAGES.map(stage => {
            const stageCustomers = getByStatus(stage.status);
            return (
              <div key={stage.status} style={{ minWidth: 200 }}>
                <div style={{
                  padding: "8px 12px", borderRadius: "8px 8px 0 0",
                  background: stage.bg, borderBottom: `2px solid ${stage.color}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: stage.color }}>
                    {stage.label}
                  </span>
                  <span style={{
                    padding: "1px 8px", borderRadius: 10,
                    background: stage.color, color: "#fff", fontSize: 11, fontWeight: "bold",
                  }}>
                    {stageCustomers.length}
                  </span>
                </div>

                <div style={{
                  background: "#f9fafb", borderRadius: "0 0 8px 8px",
                  padding: 8, minHeight: 400,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  {stageCustomers.map(c => {
                    const days = daysSince(c.last_contact_at);
                    const isOverdue = c.next_contact_at && new Date(c.next_contact_at) < new Date();
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/customers/${c.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <div style={{
                          padding: "10px 12px",
                          background: "#fff",
                          border: `1px solid ${isOverdue ? "#fca5a5" : "#e5e7eb"}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "box-shadow 0.2s",
                        }}>
                          <div style={{ fontWeight: "bold", fontSize: 13, color: "#374151", marginBottom: 4 }}>
                            {c.name}
                          </div>
                          {c.desired_budget_max && (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              〜{c.desired_budget_max.toLocaleString()}万円
                            </div>
                          )}
                          {c.desired_areas.length > 0 && (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {c.desired_areas.slice(0, 2).join("・")}
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10 }}>
                            <span style={{ color: c.assigned_staff ? "#374151" : "#9ca3af" }}>
                              {c.assigned_staff?.name ?? "未割当"}
                            </span>
                            {days !== null && (
                              <span style={{ color: days > 3 ? "#ef4444" : "#9ca3af" }}>
                                {days}日前
                              </span>
                            )}
                          </div>
                          {isOverdue && (
                            <div style={{ fontSize: 10, color: "#dc2626", marginTop: 4 }}>
                              ⚠️ 連絡期限超過
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {stageCustomers.length === 0 && (
                    <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 16 }}>
                      該当なし
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
