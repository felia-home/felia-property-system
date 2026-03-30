"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, propertyToForm, formToBody,
} from "@/components/admin/property-form-tabs";
import PhotoManager from "@/components/admin/photo-manager";
import { getWorkflowStep, WORKFLOW, WORKFLOW_KANBAN_COLUMNS, type WorkflowStatus } from "@/lib/workflow";
import { generateChecklist, calculateCompletionScore } from "@/lib/property-checklist";

// ── Workflow Progress Bar ────────────────────────────────────────────────────

const PROGRESS_STATUSES: WorkflowStatus[] = [
  "DRAFT", "AD_REQUEST", "AD_OK", "READY_TO_PUBLISH", "PUBLISHED",
];

function WorkflowProgressBar({ status }: { status: string }) {
  const currentIdx = PROGRESS_STATUSES.indexOf(status as WorkflowStatus);
  const isTerminal = ["SOLD", "CLOSED", "AD_NG", "SOLD_ALERT"].includes(status);
  const step = getWorkflowStep(status);

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0deda", padding: "14px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {PROGRESS_STATUSES.map((s, idx) => {
          const def = WORKFLOW[s];
          const done = !isTerminal && currentIdx > idx;
          const active = !isTerminal && currentIdx === idx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: idx < PROGRESS_STATUSES.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: done ? "#234f35" : active ? def.bg : "#f2f1ed",
                  border: `2px solid ${done ? "#234f35" : active ? def.color : "#d0cec8"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, transition: "all .2s",
                }}>
                  {done ? "✓" : def.icon}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: active ? 700 : 400,
                  color: active ? def.color : done ? "#234f35" : "#aaa",
                  whiteSpace: "nowrap", letterSpacing: "-.01em",
                }}>
                  {def.label}
                </span>
              </div>
              {idx < PROGRESS_STATUSES.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: "0 4px", marginBottom: 14,
                  background: done ? "#234f35" : "#e0deda", transition: "background .2s",
                }} />
              )}
            </div>
          );
        })}
        {/* Terminal states */}
        {isTerminal && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: step.bg, color: step.color,
              padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
            }}>
              {step.icon} {step.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dynamic Action Panel ─────────────────────────────────────────────────────

interface ActionPanelProps {
  property: Record<string, unknown>;
  onStatusChange: (next: string, metadata?: Record<string, string>) => Promise<void>;
  onOpenTab: (tab: "info" | "photos" | "ad_confirm") => void;
}

function ActionPanel({ property, onStatusChange, onOpenTab }: ActionPanelProps) {
  const status = String(property.status ?? "DRAFT");
  const [method, setMethod] = useState((property.ad_confirmation_method as string) ?? "FAX");
  const [confirmedBy, setConfirmedBy] = useState((property.ad_confirmed_by as string) ?? "");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<Record<string, unknown> | null>(
    property.last_check_result ? (property.last_check_result as Record<string, unknown>) : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = async (next: string, meta?: Record<string, string>) => {
    setSaving(true);
    await onStatusChange(next, meta);
    setSaving(false);
  };

  const handleAdUpload = async (result: "ok" | "ng") => {
    if (result === "ng" && !confirm("広告NGとして処理します。よろしいですか？")) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("result", result);
    if (confirmedBy) fd.append("confirmed_by", confirmedBy);
    if (uploadFile) fd.append("file", uploadFile);
    const res = await fetch(`/api/properties/${property.id}/ad-confirmation/upload`, {
      method: "POST", body: fd,
    });
    const data = await res.json();
    if (res.ok) {
      await onStatusChange("__reload__");
    } else {
      alert(data.error ?? "アップロードに失敗しました");
    }
    setSaving(false);
  };

  const handleAiCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/check`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setCheckResult(data.result);
      else alert(data.error ?? "チェックに失敗しました");
    } finally {
      setChecking(false);
    }
  };

  const daysSinceSent = property.ad_confirmation_sent_at
    ? Math.floor((Date.now() - new Date(String(property.ad_confirmation_sent_at)).getTime()) / 86_400_000)
    : null;

  const panelStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 10, border: "1px solid #e0deda",
    padding: 18, marginBottom: 14,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#706e68",
    letterSpacing: ".06em", textTransform: "uppercase",
    marginBottom: 12, display: "block",
  };
  const btnPrimary: React.CSSProperties = {
    padding: "8px 18px", borderRadius: 8, background: saving ? "#888" : "#234f35",
    color: "#fff", border: "none", fontSize: 13, fontWeight: 600,
    cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
  };
  const btnDanger: React.CSSProperties = { ...btnPrimary, background: saving ? "#888" : "#8c1f1f" };
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: "#fff", color: "#1c1b18",
    border: "1px solid #e0deda",
  };

  // ── DRAFT ──
  if (status === "DRAFT") {
    const requiredOk = property.price && Number(property.price) > 0
      && property.city && property.station_name1 && property.property_type;
    return (
      <div>
        <div style={panelStyle}>
          <span style={labelStyle}>次のアクション — 広告確認を申請する</span>
          <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14, lineHeight: 1.6 }}>
            元付業者への広告確認を開始します。<br />
            申請前に価格・所在地・最寄駅が入力されていることを確認してください。
          </p>
          {!requiredOk && (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#8a5200", marginBottom: 12 }}>
              ⚠️ 価格・市区町村・最寄駅・物件種別を入力してから申請してください。
              <button onClick={() => onOpenTab("info")} style={{ marginLeft: 8, fontSize: 11, color: "#234f35", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>物件情報を編集</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => handleStatusChange("AD_REQUEST")} disabled={saving || !requiredOk} style={{ ...btnPrimary, background: (!requiredOk || saving) ? "#aaa" : "#234f35", cursor: (!requiredOk || saving) ? "not-allowed" : "pointer" }}>
              📨 広告確認を申請する
            </button>
            <button onClick={handleAiCheck} disabled={checking} style={btnSecondary}>
              {checking ? "チェック中..." : "🤖 AIチェック"}
            </button>
          </div>
        </div>
        {checkResult && <AiCheckResultCard result={checkResult} />}
      </div>
    );
  }

  // ── AD_REQUEST ──
  if (status === "AD_REQUEST") {
    return (
      <div>
        <div style={panelStyle}>
          <span style={labelStyle}>広告確認中 — 元付業者の承諾を確認してください</span>
          {daysSinceSent !== null && daysSinceSent >= 3 && (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#8a5200", marginBottom: 12 }}>
              ⚠️ 送付から{daysSinceSent}日経過しています。リマインドの送付を検討してください。
            </div>
          )}

          {/* Seller info */}
          {(property.seller_company || property.seller_contact) && (
            <div style={{ background: "#f7f6f2", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#5a4a3a" }}>
              <strong>元付:</strong> {String(property.seller_company ?? "—")} / {String(property.seller_contact ?? "—")}
            </div>
          )}

          {/* Ad confirmation letter */}
          <div style={{ marginBottom: 14 }}>
            <a href={`/api/properties/${property.id}/ad-confirmation`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #234f35", color: "#234f35", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              📄 広告確認書を印刷・ダウンロード
            </a>
          </div>

          {/* Upload signed confirmation */}
          <div style={{ borderTop: "1px solid #f2f1ed", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#3a2a1a", marginBottom: 10 }}>承諾書の返答を登録する</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 6 }}>確認相手（担当者名）</label>
              <input type="text" value={confirmedBy} onChange={e => setConfirmedBy(e.target.value)}
                placeholder="田中様"
                style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "7px 11px", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 6 }}>返送書類（任意）</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 12, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleAdUpload("ok")} disabled={saving} style={btnPrimary}>
                ✅ 広告OK — 承諾を確認した
              </button>
              <button onClick={() => handleAdUpload("ng")} disabled={saving} style={btnDanger}>
                ❌ 広告NG
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── AD_NG ──
  if (status === "AD_NG") {
    return (
      <div style={panelStyle}>
        <span style={labelStyle}>広告不可 — 再申請または取扱い中止</span>
        <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14, lineHeight: 1.6 }}>
          元付業者から広告承諾が得られませんでした。<br />
          物件情報を修正の上、再度申請するか取扱いを中止してください。
        </p>
        <button onClick={() => handleStatusChange("DRAFT")} disabled={saving} style={btnSecondary}>
          ← 下書きに戻して再申請
        </button>
      </div>
    );
  }

  // ── AD_OK ──
  if (status === "AD_OK") {
    const photoCount = Number(property.photo_count ?? 0);
    const hasExterior = !!property.photo_has_exterior;
    const hasFloorPlan = !!property.photo_has_floor_plan;
    const photoReady = photoCount >= 5 && hasExterior && hasFloorPlan;
    return (
      <div>
        <div style={panelStyle}>
          <span style={labelStyle}>広告OK — 掲載準備を進めてください</span>
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <PhotoRequirement ok={photoCount >= 5} label={`写真枚数 ${photoCount}/5枚以上`} />
            <PhotoRequirement ok={hasExterior} label="外観写真あり" />
            <PhotoRequirement ok={hasFloorPlan} label="間取り図あり" />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!photoReady ? (
              <button onClick={() => onOpenTab("photos")} style={btnPrimary}>
                📷 写真を追加する
              </button>
            ) : (
              <button onClick={() => handleStatusChange("READY_TO_PUBLISH")} disabled={saving} style={btnPrimary}>
                🔧 掲載準備完了にする
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── READY_TO_PUBLISH ──
  if (status === "READY_TO_PUBLISH") {
    return (
      <div style={panelStyle}>
        <span style={labelStyle}>掲載準備完了 — 掲載を実行してください</span>
        <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14, lineHeight: 1.6 }}>
          全ての準備が整いました。HP・ポータルへの掲載を実行できます。
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => handleStatusChange("PUBLISHED")} disabled={saving} style={btnPrimary}>
            🟢 掲載する
          </button>
          <button onClick={() => handleStatusChange("AD_OK")} disabled={saving} style={btnSecondary}>
            修正のため戻す
          </button>
        </div>
      </div>
    );
  }

  // ── PUBLISHED ──
  if (status === "PUBLISHED") {
    const daysListed = property.published_at
      ? Math.floor((Date.now() - new Date(String(property.published_at)).getTime()) / 86_400_000)
      : null;
    return (
      <div>
        <div style={panelStyle}>
          <span style={labelStyle}>掲載中</span>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <Kpi label="掲載日数" value={daysListed !== null ? `${daysListed}日` : "—"} warn={daysListed !== null && daysListed > 60} />
            <Kpi label="問い合わせ" value={`${Number(property.inquiry_count ?? 0)}件`} />
          </div>
          {daysListed !== null && daysListed > 60 && (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#8a5200", marginBottom: 12 }}>
              ⚠️ 掲載から{daysListed}日経過しています。価格改定または成約アラートを検討してください。
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleAiCheck} disabled={checking} style={btnSecondary}>
              {checking ? "チェック中..." : "🤖 AIチェック"}
            </button>
            <button onClick={() => handleStatusChange("SOLD_ALERT")} disabled={saving}
              style={{ ...btnSecondary, color: "#b71c1c", borderColor: "#b71c1c" }}>
              🔔 成約アラート
            </button>
            <button onClick={() => handleStatusChange("READY_TO_PUBLISH")} disabled={saving} style={btnSecondary}>
              内容修正
            </button>
          </div>
        </div>
        {checkResult && <AiCheckResultCard result={checkResult} />}
      </div>
    );
  }

  // ── SOLD_ALERT ──
  if (status === "SOLD_ALERT") {
    return (
      <div style={{ ...panelStyle, border: "1px solid #f48fb1" }}>
        <span style={{ ...labelStyle, color: "#b71c1c" }}>成約アラート — 確認が必要です</span>
        <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14, lineHeight: 1.6 }}>
          この物件は成約している可能性があります。元付業者に物確してください。
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => {
            if (!confirm("成約を確定します。この操作は取り消せません。よろしいですか？")) return;
            handleStatusChange("SOLD");
          }} disabled={saving} style={btnDanger}>
            🏡 成約を確定する
          </button>
          <button onClick={() => handleStatusChange("PUBLISHED")} disabled={saving} style={btnSecondary}>
            掲載を継続する
          </button>
        </div>
      </div>
    );
  }

  // ── SOLD ──
  if (status === "SOLD") {
    return (
      <div style={panelStyle}>
        <span style={labelStyle}>成約済み</span>
        <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14 }}>成約が確定しました。成約データを記録の上、クローズしてください。</p>
        <button onClick={() => handleStatusChange("CLOSED")} disabled={saving} style={btnSecondary}>
          🔒 クローズ（アーカイブ）
        </button>
      </div>
    );
  }

  return null;
}

// ── Helper Components ─────────────────────────────────────────────────────────

function PhotoRequirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <span style={{ color: ok ? "#2e7d32" : "#9e9e9e", fontSize: 15 }}>{ok ? "✅" : "⬜"}</span>
      <span style={{ color: ok ? "#1b5e20" : "#888" }}>{label}</span>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#706e68", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: warn ? "#e65100" : "#1c1b18" }}>{value}</div>
    </div>
  );
}

function AiCheckResultCard({ result }: { result: Record<string, unknown> }) {
  const status = String(result.status ?? "ok");
  const score = Number(result.score ?? 0);
  const issues = (result.issues as Array<Record<string, string>>) ?? [];
  const recommendation = String(result.recommendation ?? "");
  const checkedAt = result.checked_at ? new Date(String(result.checked_at)) : null;

  const bgColor = status === "alert" ? "#fce4ec" : status === "warning" ? "#fff8e1" : "#e8f5e9";
  const borderColor = status === "alert" ? "#f48fb1" : status === "warning" ? "#ffe082" : "#a5d6a7";
  const textColor = status === "alert" ? "#b71c1c" : status === "warning" ? "#8a5200" : "#1b5e20";

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
          🤖 AIチェック結果 — スコア: {score}/100
        </span>
        {checkedAt && (
          <span style={{ fontSize: 10, color: "#888" }}>{checkedAt.toLocaleString("ja-JP")}</span>
        )}
      </div>
      {recommendation && (
        <p style={{ fontSize: 13, color: textColor, marginBottom: issues.length > 0 ? 10 : 0, lineHeight: 1.6 }}>
          {recommendation}
        </p>
      )}
      {issues.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {issues.map((issue, i) => (
            <div key={i} style={{ fontSize: 12, color: "#3a2a1a", display: "flex", gap: 6 }}>
              <span>{issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "⚪"}</span>
              <span><strong>{issue.field}:</strong> {issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Completion Meter ──────────────────────────────────────────────────────────

function CompletionMeter({
  property,
  onTabSwitch,
}: {
  property: Record<string, unknown>;
  onTabSwitch: (tab: "photos" | "ad_confirm") => void;
}) {
  const checks = generateChecklist(property as Parameters<typeof generateChecklist>[0]);
  const score = calculateCompletionScore(checks);
  const incomplete = checks.filter(c => !c.completed && c.severity === "required");
  if (score === 100 && incomplete.length === 0) return null;

  const barColor = score >= 80 ? "#234f35" : score >= 50 ? "#f57c00" : "#8c1f1f";

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0deda", padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: incomplete.length > 0 ? 10 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#706e68", whiteSpace: "nowrap" }}>完成度</span>
        <div style={{ flex: 1, height: 7, background: "#f2f1ed", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 99, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor, whiteSpace: "nowrap" }}>{score}%</span>
      </div>
      {incomplete.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {incomplete.slice(0, 6).map(c => (
            <button key={c.id} onClick={() => {
              if (c.id === "ad_confirmed") onTabSwitch("ad_confirm");
              else if (c.category === "写真") onTabSwitch("photos");
            }}
              style={{ fontSize: 10, background: "#fdeaea", color: "#8c1f1f", padding: "2px 8px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              ❌ {c.label}
            </button>
          ))}
          {incomplete.length > 6 && (
            <span style={{ fontSize: 10, color: "#888", padding: "2px 4px" }}>…他{incomplete.length - 6}件</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [property, setProperty] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [mainTab, setMainTab] = useState<"info" | "photos" | "ad_confirm" | "workflow">("workflow");
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadProperty = async () => {
    const res = await fetch(`/api/properties/${params.id}`);
    const d = await res.json();
    if (res.ok && d.property) {
      setProperty(d.property);
      setForm(propertyToForm(d.property));
    }
  };

  useEffect(() => {
    loadProperty()
      .catch(() => setMsg({ text: "物件情報の取得に失敗しました", ok: false }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.error ?? "更新に失敗しました", ok: false }); return; }
      setProperty(data.property);
      setForm(propertyToForm(data.property));
      setEditing(false);
    } catch { setMsg({ text: "通信エラーが発生しました", ok: false }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (next: string, metadata?: Record<string, string>) => {
    // Special signal to just reload
    if (next === "__reload__") {
      await loadProperty();
      return;
    }

    const step = getWorkflowStep(next);
    const res = await fetch(`/api/properties/${params.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, metadata: metadata ?? {} }),
    });
    const data = await res.json();
    if (res.ok) {
      setProperty(data.property);
      setForm(propertyToForm(data.property));
      if (data.next_action) {
        setMsg({ text: `✅ ${data.next_action}`, ok: true });
        setTimeout(() => setMsg(null), 6000);
      }
    } else {
      setMsg({ text: data.error ?? "更新に失敗しました", ok: false });
    }
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!property) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>物件が見つかりません</div>;

  const status = String(property.status ?? "DRAFT");
  const step = getWorkflowStep(status);
  const needsAdConfirm = !property.ad_confirmed_at && !["DRAFT", "CLOSED", "AD_NG"].includes(status);

  return (
    <div style={{ padding: 28 }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#f7f6f2", borderBottom: "1px solid #e0deda",
        marginBottom: 14, paddingBottom: 14, paddingTop: 4,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <button onClick={() => router.push("/admin/properties")}
            style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ← 物件一覧
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 18, fontWeight: 500 }}>
              {String(property.city ?? "")} {String(property.town ?? "")} {String(property.address ?? "")}
            </h1>
            <span style={{ background: step.bg, color: step.color, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
              {step.icon} {step.label}
            </span>
            {property.property_number && (
              <span style={{ fontSize: 11, color: "#888" }}>{String(property.property_number)}</span>
            )}
          </div>
          {property.price && (
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8c1f1f", marginTop: 2 }}>
              {Number(property.price).toLocaleString()}万円
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {!editing ? (
            <button onClick={() => { setEditing(true); setMainTab("info"); }}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              編集
            </button>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setForm(propertyToForm(property)); setMsg(null); }}
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

      {msg && (
        <div style={{ background: msg.ok ? "#e8f5e9" : "#fdeaea", color: msg.ok ? "#1b5e20" : "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* Workflow progress bar */}
      <WorkflowProgressBar status={status} />

      {/* Completion meter */}
      <CompletionMeter property={property} onTabSwitch={t => setMainTab(t as "photos" | "ad_confirm")} />

      {/* Main tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {([
          ["workflow", "アクション"],
          ["info", "物件情報"],
          ["photos", "写真管理"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setMainTab(t)}
            style={{ padding: "8px 20px", fontSize: 13, borderRadius: 8, border: "1px solid " + (mainTab === t ? "#234f35" : "#e0deda"), background: mainTab === t ? "#234f35" : "#fff", color: mainTab === t ? "#fff" : "#706e68", fontWeight: mainTab === t ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
            {t === "workflow" && needsAdConfirm && (
              <span title="広告確認が未完了です。アクションタブで対応してください" style={{ marginLeft: 5, fontSize: 10, background: "#e65100", color: "#fff", borderRadius: 99, padding: "1px 5px" }}>!</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        {mainTab === "workflow" && (
          <ActionPanel
            property={property}
            onStatusChange={handleStatusChange}
            onOpenTab={(t) => setMainTab(t)}
          />
        )}
        {mainTab === "info" && (
          <PropertyFormTabs tab={tab} setTab={setTab} form={form} setForm={setForm} />
        )}
        {mainTab === "photos" && (
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
