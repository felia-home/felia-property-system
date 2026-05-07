"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

// ── 定義 ────────────────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { status: "NEW",         label: "新規問い合わせ", color: "#6b7280", bg: "#f9fafb" },
  { status: "CONTACTING",  label: "コンタクト中",   color: "#3b82f6", bg: "#eff6ff" },
  { status: "CONTACTED",   label: "コンタクト済",   color: "#0ea5e9", bg: "#f0f9ff" },
  { status: "INVITING",    label: "案内誘致中",     color: "#10b981", bg: "#ecfdf5" },
  { status: "VISITING",    label: "案内中",         color: "#f59e0b", bg: "#fffbeb" },
  { status: "NEGOTIATING", label: "検討・商談中",   color: "#ef4444", bg: "#fef2f2" },
  { status: "CONTRACT",    label: "契約",           color: "#8b5cf6", bg: "#faf5ff" },
  { status: "PENDING",     label: "保留",           color: "#06b6d4", bg: "#ecfeff" },
] as const;

const SOURCE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  SUUMO:     { bg: "#fee2e2", color: "#991b1b", label: "SUUMO" },
  ATHOME:    { bg: "#fed7aa", color: "#9a3412", label: "athome" },
  YAHOO:     { bg: "#e9d5ff", color: "#6b21a8", label: "Yahoo" },
  HOMES:     { bg: "#fef3c7", color: "#92400e", label: "HOME'S" },
  HP:        { bg: "#dcfce7", color: "#166534", label: "HP" },
  HP_MEMBER: { bg: "#bbf7d0", color: "#14532d", label: "HP会員" },
  TEL:       { bg: "#dbeafe", color: "#1e40af", label: "電話" },
  WALK_IN:   { bg: "#cffafe", color: "#155e75", label: "来店" },
  OTHER:     { bg: "#f3f4f6", color: "#374151", label: "その他" },
};

const LOST_REASONS: Record<string, string> = {
  COMPETITOR:     "他決（他社で契約）",
  DO_NOT_CONTACT: "連絡停止要望",
  BUDGET:         "予算・資金面",
  CONDITION:      "希望条件が合わない",
  TIMING:         "時期が合わない",
  NO_RESPONSE:    "連絡途絶",
  OTHER:          "その他",
};

interface PipelineCustomer {
  id: string;
  name: string;
  status: string;
  priority: string;
  ai_score: number | null;
  desired_budget_max: number | null;
  desired_areas: string[];
  last_contact_at: string | null;
  next_contact_at: string | null;
  lost_reason: string | null;
  lost_at: string | null;
  lost_note: string | null;
  do_not_contact: boolean;
  assigned_staff: { id: string; name: string } | null;
  stats: {
    contact_attempts:  number;
    call_count:        number;
    email_count:       number;
    showing_count:     number;
    last_call_at:      string | null;
    last_email_at:     string | null;
    last_email_result: string | null;
    last_email_dir:    string | null;
    last_showing_at:   string | null;
    last_showing_prop: string | null;
    last_inquiry_src:  string | null;
    last_inquiry_at:   string | null;
  };
}

// ── ヘルパー ────────────────────────────────────────────────────────────────────
function daysSince(d: string | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function formatDate(d: string | null, withTime = false): string {
  if (!d) return "—";
  const date = new Date(d);
  const base = `${date.getMonth() + 1}/${date.getDate()}`;
  if (!withTime) return base;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${base} ${hh}:${mm}`;
}

// ── パイプラインカード ──────────────────────────────────────────────────────────
function PipelineCard({ c, isDragging }: { c: PipelineCustomer; isDragging: boolean }) {
  const days = daysSince(c.last_contact_at);
  const isOverdue = c.next_contact_at && new Date(c.next_contact_at) < new Date();

  // ステージ別の追加情報
  let stageDetails: React.ReactNode = null;
  if (c.status === "NEW") {
    const src = c.stats.last_inquiry_src;
    const srcDef = src ? SOURCE_COLORS[src] ?? SOURCE_COLORS.OTHER : null;
    stageDetails = (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
        {srcDef && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: srcDef.bg, color: srcDef.color, fontWeight: "bold" }}>
            {srcDef.label}
          </span>
        )}
        {c.stats.last_inquiry_at && (
          <span style={{ fontSize: 10, color: "#6b7280" }}>
            問合 {formatDate(c.stats.last_inquiry_at)}
          </span>
        )}
      </div>
    );
  } else if (c.status === "CONTACTING") {
    const lastTry = c.stats.last_call_at ?? c.stats.last_email_at;
    stageDetails = (
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
        試行 <strong>{c.stats.contact_attempts}</strong> 回
        {lastTry && <span> · 最終 {formatDate(lastTry)}</span>}
      </div>
    );
  } else if (c.status === "CONTACTED") {
    stageDetails = (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
        {c.stats.last_call_at && (
          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#dbeafe", color: "#1e40af" }}>
            📞 {formatDate(c.stats.last_call_at)}
          </span>
        )}
        {c.stats.last_email_at && (
          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#e9d5ff", color: "#6b21a8" }}>
            📧 {formatDate(c.stats.last_email_at)}
          </span>
        )}
      </div>
    );
  } else if (c.status === "INVITING") {
    const replied = c.stats.last_email_dir === "INBOUND";
    stageDetails = (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
        {c.stats.last_email_at && (
          <span style={{ fontSize: 10, color: "#6b7280" }}>
            最終送信 {formatDate(c.stats.last_email_at)}
          </span>
        )}
        {replied && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#dcfce7", color: "#166534", fontWeight: "bold" }}>
            返信あり
          </span>
        )}
        {c.stats.last_email_result && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>
            {c.stats.last_email_result}
          </span>
        )}
      </div>
    );
  } else if (c.status === "VISITING") {
    stageDetails = (
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
        {c.stats.last_showing_prop && <div>🏠 {c.stats.last_showing_prop}</div>}
        <div>案内 <strong>{c.stats.showing_count}</strong> 回
          {c.stats.last_showing_at && <span> · 最終 {formatDate(c.stats.last_showing_at)}</span>}
        </div>
      </div>
    );
  } else if (c.status === "NEGOTIATING") {
    stageDetails = (
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
        検討中の物件 <strong>{c.stats.showing_count}</strong> 件
        {c.stats.last_showing_at && <span> · 最終案内 {formatDate(c.stats.last_showing_at)}</span>}
      </div>
    );
  }

  return (
    <div style={{
      padding: "10px 12px",
      background: "#fff",
      border: `1px solid ${isOverdue ? "#fca5a5" : "#e5e7eb"}`,
      borderRadius: 8,
      cursor: "grab",
      opacity: isDragging ? 0.5 : 1,
      boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
      transition: "box-shadow 0.2s, opacity 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <Link
          href={`/admin/customers/${c.id}`}
          style={{ flex: 1, fontWeight: "bold", fontSize: 13, color: "#374151", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {c.name}
        </Link>
        {c.priority === "HIGH" && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#fee2e2", color: "#991b1b", fontWeight: "bold" }}>
            高
          </span>
        )}
      </div>

      {c.desired_budget_max != null && (
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          〜{c.desired_budget_max.toLocaleString()}万円
        </div>
      )}
      {c.desired_areas.length > 0 && (
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          {c.desired_areas.slice(0, 2).join("・")}
        </div>
      )}

      {stageDetails}

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
  );
}

// ── 追客終了モーダル ──────────────────────────────────────────────────────────
function LostModal({
  open, customerName, onCancel, onConfirm,
}: {
  open: boolean;
  customerName: string;
  onCancel: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote]     = useState("");

  useEffect(() => {
    if (open) { setReason(""); setNote(""); }
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 480, maxWidth: "90vw" }}>
        <h3 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>追客終了</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{customerName} 様</div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 8 }}>
            終了理由 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(LOST_REASONS).map(([v, l]) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "4px 6px", borderRadius: 4, background: reason === v ? "#fef2f2" : "transparent" }}>
                <input type="radio" name="lost_reason" value={v} checked={reason === v} onChange={() => setReason(v)} />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
            補足メモ（任意）
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="補足情報があれば"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button" onClick={onCancel}
            style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, note)}
            disabled={!reason}
            style={{
              padding: "8px 20px", borderRadius: 6, border: "none",
              background: reason ? "#ef4444" : "#e5e7eb",
              color: reason ? "#fff" : "#9ca3af",
              fontSize: 13, fontWeight: "bold",
              cursor: reason ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            追客終了にする
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ページ本体 ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [customers, setCustomers] = useState<PipelineCustomer[]>([]);
  const [loading, setLoading]     = useState(false);
  const [storeId, setStoreId]     = useState("");
  const [stores, setStores]       = useState<{ id: string; name: string }[]>([]);
  const [showLost, setShowLost]   = useState(false);

  // LOST モーダル
  const [pendingLost, setPendingLost] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(storeId ? { store_id: storeId } : {});
      const res = await fetch(`/api/admin/customers/pipeline?${params}`);
      const d = await res.json();
      setCustomers(d.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then(r => r.json())
      .then(d => setStores([{ id: "", name: "全店舗" }, ...(d.branches ?? [])]))
      .catch(() => setStores([{ id: "", name: "全店舗" }]));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    if (!res.ok) {
      alert("ステータス更新に失敗しました");
      await load();
      return;
    }
    // 楽観的に更新済みのstateを正しく置き換え
    await load();
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const customer = customers.find(c => c.id === draggableId);
    if (!customer) return;

    if (newStatus === "LOST") {
      setPendingLost({ id: customer.id, name: customer.name });
      return;
    }

    // 楽観的更新（UI即反映）
    setCustomers(prev =>
      prev.map(c => c.id === draggableId ? { ...c, status: newStatus } : c)
    );
    void updateStatus(draggableId, newStatus);
  };

  const handleLostConfirm = async (reason: string, note: string) => {
    if (!pendingLost) return;
    const target = pendingLost;
    setPendingLost(null);

    const extra: Record<string, unknown> = {
      lost_reason: reason,
      lost_at:     new Date().toISOString(),
      lost_note:   note || null,
    };
    if (reason === "DO_NOT_CONTACT") extra.do_not_contact = true;

    setCustomers(prev =>
      prev.map(c => c.id === target.id
        ? { ...c, status: "LOST", lost_reason: reason, lost_at: new Date().toISOString(), lost_note: note || null }
        : c
      )
    );
    await updateStatus(target.id, "LOST", extra);
  };

  const handleReactivate = async (c: PipelineCustomer) => {
    if (!confirm(`${c.name} さんを再活性化しますか？（ステータスを「新規問い合わせ」に戻します）`)) return;
    await updateStatus(c.id, "NEW", {
      lost_reason: null,
      lost_at:     null,
      lost_note:   null,
    });
  };

  const getByStatus = (status: string) =>
    customers.filter(c => c.status === status);
  // CONTRACT カラムは CLOSED も統合
  const contractCustomers = customers.filter(c => c.status === "CONTRACT" || c.status === "CLOSED");
  const lostCustomers = customers.filter(c => c.status === "LOST");

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>🗂️ 顧客パイプライン</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            カードをドラッグしてステータスを変更できます
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(200px, 1fr))`,
            gap: 12,
            overflowX: "auto",
            minWidth: 0,
          }}>
            {PIPELINE_STAGES.map(stage => {
              const stageCustomers = stage.status === "CONTRACT"
                ? contractCustomers
                : getByStatus(stage.status);
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

                  <Droppable droppableId={stage.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          background: snapshot.isDraggingOver ? `${stage.color}11` : "#f9fafb",
                          borderRadius: "0 0 8px 8px",
                          padding: 8,
                          minHeight: 400,
                          display: "flex", flexDirection: "column", gap: 6,
                          transition: "background 0.2s",
                        }}
                      >
                        {stageCustomers.map((c, i) => (
                          <Draggable key={c.id} draggableId={c.id} index={i}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={prov.draggableProps.style}
                              >
                                <PipelineCard c={c} isDragging={snap.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageCustomers.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 16 }}>
                            該当なし
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>

          {/* 追客終了ゾーン（LOST） — DnD のドロップ先としても機能 */}
          <div style={{
            marginTop: 24, background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden",
          }}>
            <button
              type="button"
              onClick={() => setShowLost(s => !s)}
              style={{
                width: "100%", padding: "10px 14px",
                background: "#f3f4f6", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#6b7280" }}>
                ❌ 追客終了 ({lostCustomers.length})
              </span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                {showLost ? "▼ 折りたたむ" : "▶ 展開"}
              </span>
            </button>
            <Droppable droppableId="LOST" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    padding: 12,
                    display: showLost ? "flex" : (snapshot.isDraggingOver ? "flex" : "none"),
                    gap: 8, overflowX: "auto",
                    background: snapshot.isDraggingOver ? "#fef2f2" : "#fff",
                    minHeight: snapshot.isDraggingOver ? 80 : "auto",
                    transition: "background 0.2s",
                  }}
                >
                  {(showLost ? lostCustomers : []).map((c, i) => (
                    <Draggable key={c.id} draggableId={c.id} index={i}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{ ...prov.draggableProps.style, minWidth: 220, flexShrink: 0 }}
                        >
                          <div style={{
                            padding: "10px 12px", background: "#fff",
                            border: "1px solid #fca5a5", borderRadius: 8,
                            opacity: snap.isDragging ? 0.5 : 1,
                          }}>
                            <Link href={`/admin/customers/${c.id}`} style={{ fontWeight: "bold", fontSize: 13, color: "#374151", textDecoration: "none" }}>
                              {c.name}
                            </Link>
                            {c.lost_reason && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#fee2e2", color: "#991b1b", fontWeight: "bold" }}>
                                  {LOST_REASONS[c.lost_reason] ?? c.lost_reason}
                                </span>
                              </div>
                            )}
                            {c.lost_at && (
                              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                                終了 {formatDate(c.lost_at)}
                              </div>
                            )}
                            {c.lost_note && (
                              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, whiteSpace: "pre-wrap" }}>
                                {c.lost_note}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleReactivate(c); }}
                              style={{
                                marginTop: 8, padding: "3px 10px", borderRadius: 4, fontSize: 11,
                                border: "1px solid #86efac", background: "#f0fdf4", color: "#166534",
                                cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              ↺ 再活性化
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {showLost && lostCustomers.length === 0 && (
                    <div style={{ fontSize: 12, color: "#9ca3af", padding: 16, textAlign: "center", flex: 1 }}>
                      追客終了の顧客はいません
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}

      <LostModal
        open={!!pendingLost}
        customerName={pendingLost?.name ?? ""}
        onCancel={() => setPendingLost(null)}
        onConfirm={handleLostConfirm}
      />
    </div>
  );
}
