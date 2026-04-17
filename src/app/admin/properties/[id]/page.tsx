"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, propertyToForm, formToBody,
} from "@/components/admin/property-form-tabs";
import PhotoManager from "@/components/admin/photo-manager";
import { getWorkflowStep, WORKFLOW, WORKFLOW_KANBAN_COLUMNS, type WorkflowStatus } from "@/lib/workflow";
import { calcPropertyCompletion, type PropertyForCompletion } from "@/lib/property-completion";

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

const MEDIA_FLAGS = [
  { key: "published_suumo",   label: "SUUMO" },
  { key: "published_athome",  label: "athome" },
  { key: "published_yahoo",   label: "Yahoo不動産" },
  { key: "published_homes",   label: "HOMES" },
] as const;

type MediaFlagKey = typeof MEDIA_FLAGS[number]["key"];

function ActionPanel({ property, onStatusChange, onOpenTab }: ActionPanelProps) {
  const status = String(property.status ?? "DRAFT");
  const [method, setMethod] = useState((property.ad_confirmation_method as string) ?? "FAX");
  const [confirmedBy, setConfirmedBy] = useState((property.ad_confirmed_by as string) ?? "");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaFlags, setMediaFlags] = useState<Record<MediaFlagKey, boolean>>({
    published_suumo:   !!property.published_suumo,
    published_athome:  !!property.published_athome,
    published_yahoo:   !!property.published_yahoo,
    published_homes:   !!property.published_homes,
  });
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
      // 広告OKの場合、選択した媒体フラグをPATCH
      if (result === "ok") {
        await fetch(`/api/properties/${property.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mediaFlags),
        });
      }
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
    const { canPublish, required: missingRequired } = calcPropertyCompletion(property as PropertyForCompletion);
    return (
      <div>
        <div style={panelStyle}>
          <span style={labelStyle}>次のアクション — 広告確認を申請する</span>
          <p style={{ fontSize: 13, color: "#706e68", marginBottom: 14, lineHeight: 1.6 }}>
            元付業者への広告確認を開始します。<br />
            申請前に価格・所在地・最寄駅・面積が入力されていることを確認してください。
          </p>
          {!canPublish && (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#8a5200", marginBottom: 12 }}>
              ⚠️ 未入力の必須項目: {missingRequired.join("・")}
              <button onClick={() => onOpenTab("info")} style={{ marginLeft: 8, fontSize: 11, color: "#234f35", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>物件情報を編集</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => handleStatusChange("AD_REQUEST")} disabled={saving || !canPublish} style={{ ...btnPrimary, background: (!canPublish || saving) ? "#aaa" : "#234f35", cursor: (!canPublish || saving) ? "not-allowed" : "pointer" }}>
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

            {/* 媒体選択チェックボックス */}
            <div style={{ border: "1px solid #e0deda", borderRadius: 8, padding: 14, marginBottom: 14, background: "#f9fafb" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>📋 ポータルサイト掲載許可（広告確認）</div>
              <div style={{ fontSize: 11, color: "#706e68", marginBottom: 10 }}>今回の広告確認でOKとなったポータルにチェックしてください</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>※ HP・会員公開はHP設定タブから内勤が手動で設定してください</div>
              {MEDIA_FLAGS.map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={mediaFlags[key]}
                    onChange={e => setMediaFlags(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#234f35" }}
                  />
                  <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
                </label>
              ))}
            </div>

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

// ── HP Flag Panel ─────────────────────────────────────────────────────────────

function HpFlagPanel({
  property,
  onReload,
}: {
  property: Record<string, unknown>;
  onReload: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const id = String(property.id);

  const patch = async (data: Record<string, unknown>) => {
    setSaving(true);
    await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await onReload();
    setSaving(false);
  };

  const isPublishedHp = !!property.published_hp;
  const isPublishedMembers = !!property.published_members;
  const isFeliaSel = !!property.is_felia_selection;
  const isOpenHouse = !!property.is_open_house;
  const openHouseStart = property.open_house_start ? String(property.open_house_start).slice(0, 16) : "";
  const openHouseEnd = property.open_house_end ? String(property.open_house_end).slice(0, 16) : "";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>🌐 HP表示設定</div>
        <div style={{ fontSize: 12, color: "#706e68" }}>HPへの公開設定とトップページに表示する特別フラグを設定します</div>
      </div>

      {/* HP公開設定 */}
      <div style={{
        background: isPublishedHp ? "#f0fdf4" : "#f9fafb",
        border: `2px solid ${isPublishedHp ? "#5BAD52" : "#e5e7eb"}`,
        borderRadius: 12, padding: 18, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>🌐 HP公開</div>
            <div style={{ fontSize: 12, color: "#706e68" }}>
              {isPublishedHp ? "HPに掲載中です" : "HPに未掲載です。公開すると一般ユーザーに表示されます。"}
            </div>
          </div>
          <button
            disabled={saving}
            onClick={() => patch({ published_hp: !isPublishedHp })}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none",
              background: saving ? "#aaa" : isPublishedHp ? "#dc2626" : "#5BAD52",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              flexShrink: 0, marginLeft: 16,
            }}
          >
            {isPublishedHp ? "非公開にする" : "HPに公開する"}
          </button>
        </div>
      </div>

      {/* 会員限定公開 */}
      <div style={{
        background: isPublishedMembers ? "#eff6ff" : "#f9fafb",
        border: `2px solid ${isPublishedMembers ? "#3b82f6" : "#e5e7eb"}`,
        borderRadius: 12, padding: 18, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>🔒 会員限定公開</div>
            <div style={{ fontSize: 12, color: "#706e68" }}>
              {isPublishedMembers ? "会員限定ページに掲載中です" : "会員限定ページに未掲載です"}
            </div>
          </div>
          <button
            disabled={saving}
            onClick={() => patch({ published_members: !isPublishedMembers })}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none",
              background: saving ? "#aaa" : isPublishedMembers ? "#dc2626" : "#3b82f6",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              flexShrink: 0, marginLeft: 16,
            }}
          >
            {isPublishedMembers ? "非公開にする" : "会員限定で公開"}
          </button>
        </div>
      </div>

      {/* 厳選物件フラグ */}
      <div style={{ background: "#fffde7", border: "1px solid #fff176", borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>⭐ Felia Selection（厳選物件）</div>
            <div style={{ fontSize: 12, color: "#706e68" }}>HPトップの「厳選物件情報」セクションに表示されます</div>
          </div>
          <button
            disabled={saving}
            onClick={() => patch({ is_felia_selection: !isFeliaSel })}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: isFeliaSel ? "none" : "2px solid #f9a825",
              background: isFeliaSel ? "#f9a825" : "transparent",
              color: isFeliaSel ? "#fff" : "#f57f17",
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              flexShrink: 0, marginLeft: 16,
            }}
          >
            {isFeliaSel ? "✅ 設定中" : "設定する"}
          </button>
        </div>
      </div>

      {/* 現地販売会フラグ */}
      <div style={{ background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isOpenHouse ? 16 : 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>🏠 現地販売会</div>
            <div style={{ fontSize: 12, color: "#706e68" }}>HPトップの「Open House」セクションに表示されます</div>
          </div>
          <button
            disabled={saving}
            onClick={() => patch({ is_open_house: !isOpenHouse })}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: isOpenHouse ? "none" : "2px solid #ef6c00",
              background: isOpenHouse ? "#ef6c00" : "transparent",
              color: isOpenHouse ? "#fff" : "#e65100",
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              flexShrink: 0, marginLeft: 16,
            }}
          >
            {isOpenHouse ? "✅ 設定中" : "設定する"}
          </button>
        </div>
        {isOpenHouse && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#706e68", display: "block", marginBottom: 6 }}>開始日時</label>
              <input
                type="datetime-local"
                defaultValue={openHouseStart}
                onChange={async e => {
                  await fetch(`/api/properties/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ open_house_start: e.target.value }),
                  });
                  await onReload();
                }}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#706e68", display: "block", marginBottom: 6 }}>終了日時</label>
              <input
                type="datetime-local"
                defaultValue={openHouseEnd}
                onChange={async e => {
                  await fetch(`/api/properties/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ open_house_end: e.target.value }),
                  });
                  await onReload();
                }}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0deda", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ポータルサイト掲載設定 */}
      <div style={{ border: "1px solid #e0deda", borderRadius: 12, padding: 18, marginTop: 14, background: "#fff" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1b18", marginBottom: 4 }}>🏢 ポータルサイト掲載設定</div>
        <div style={{ fontSize: 12, color: "#706e68", marginBottom: 16 }}>
          広告確認時の設定を後から変更できます。※ 現在はフラグ管理のみ。API連携後に自動掲載されます。
        </div>
        {([
          { key: "published_suumo",  label: "SUUMO",       color: "#00a040" },
          { key: "published_athome", label: "athome",      color: "#e4007f" },
          { key: "published_yahoo",  label: "Yahoo不動産",  color: "#ff0033" },
          { key: "published_homes",  label: "HOMES",       color: "#0066cc" },
        ] as { key: string; label: string; color: string }[]).map(({ key, label, color }) => {
          const isOn = !!(property as Record<string, unknown>)[key];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1c1b18" }}>{label}</span>
                {isOn && (
                  <span style={{ fontSize: 10, padding: "2px 7px", background: "#dcfce7", color: "#15803d", borderRadius: 4, fontWeight: 700 }}>
                    掲載予定
                  </span>
                )}
              </div>
              <button
                disabled={saving}
                onClick={() => patch({ [key]: !isOn })}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: "none",
                  background: saving ? "#aaa" : isOn ? "#dc2626" : color,
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                {isOn ? "掲載解除" : "掲載予約"}
              </button>
            </div>
          );
        })}
      </div>
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
  const { score, required, missing } = calcPropertyCompletion(property as PropertyForCompletion);
  const allMissing = [...required, ...missing];
  if (score === 100 && allMissing.length === 0) return null;

  const barColor = score >= 80 ? "#234f35" : score >= 50 ? "#f57c00" : "#8c1f1f";

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0deda", padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: allMissing.length > 0 ? 10 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#706e68", whiteSpace: "nowrap" }}>完成度</span>
        <div style={{ flex: 1, height: 7, background: "#f2f1ed", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 99, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor, whiteSpace: "nowrap" }}>{score}%</span>
      </div>
      {allMissing.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {required.map(label => (
            <button key={label} onClick={() => onTabSwitch("photos")}
              style={{ fontSize: 10, background: "#fdeaea", color: "#8c1f1f", padding: "2px 8px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              ❌ {label}
            </button>
          ))}
          {missing.slice(0, Math.max(0, 6 - required.length)).map(label => (
            <button key={label} onClick={() => {
              if (label === "外観写真" || label === "間取り図" || label.includes("写真")) onTabSwitch("photos");
            }}
              style={{ fontSize: 10, background: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              △ {label}
            </button>
          ))}
          {allMissing.length > 6 && (
            <span style={{ fontSize: 10, color: "#888", padding: "2px 4px" }}>…他{allMissing.length - 6}件</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Copy Field Component ──────────────────────────────────────────────────────

function CopyField({
  label, value, onChange, maxLen, rows = 2,
}: {
  label: string; value: string; onChange: (v: string) => void; maxLen: number; rows?: number;
}) {
  const len = value.length;
  const over = len > maxLen;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1c1b18" }}>{label}</span>
        <span style={{ fontSize: 10, color: over ? "#e65100" : "#9e9e9e" }}>{len}/{maxLen}文字</span>
      </div>
      {rows <= 2 ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${over ? "#e65100" : "#e0deda"}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
        />
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${over ? "#e65100" : "#e0deda"}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
        />
      )}
    </div>
  );
}

// ── CheckTab ─────────────────────────────────────────────────────────────────

interface CheckLog {
  id: string;
  checked_at: string;
  old_price: number | null;
  new_price: number | null;
  note: string | null;
  staff: { id: string; name: string } | null;
}

function CheckTab({ propertyId, property }: {
  propertyId: string;
  property: Record<string, unknown>;
}) {
  const [logs, setLogs] = useState<CheckLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    setLoadingLogs(true);
    fetch(`/api/properties/${propertyId}/check`)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [propertyId]);

  const lastCheckedAt = property.last_checked_at ? String(property.last_checked_at) : null;
  const checkIntervalDays = Number(property.check_interval_days ?? 14);
  const hasPortal = Boolean(property.published_suumo) || Boolean(property.published_athome) ||
    Boolean(property.published_yahoo) || Boolean(property.published_homes);

  const statusBg = (() => {
    if (!lastCheckedAt) return "#fffbeb";
    const days = Math.floor((Date.now() - new Date(lastCheckedAt).getTime()) / 86_400_000);
    if (days >= checkIntervalDays) return "#fef2f2";
    if (days >= checkIntervalDays - 2) return "#fff7ed";
    return "#f0fdf4";
  })();

  return (
    <div>
      {/* 確認期限ステータス */}
      <div style={{ padding: 20, borderRadius: 8, marginBottom: 20, backgroundColor: statusBg, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>📅 物件確認状況</h3>
        <p style={{ fontSize: 13, color: "#374151", margin: "0 0 4px" }}>
          確認間隔：{checkIntervalDays}日
          （{hasPortal ? "ポータル掲載中のため7日" : "HP掲載のみのため14日"}）
        </p>
        <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
          最終確認：{lastCheckedAt
            ? `${new Date(lastCheckedAt).toLocaleDateString("ja-JP")}（${
                Math.floor((Date.now() - new Date(lastCheckedAt).getTime()) / 86_400_000)
              }日前）`
            : "未確認"}
        </p>
      </div>

      {/* 物件確認リストへのリンク */}
      <a
        href="/admin/properties/check"
        style={{
          display: "block", padding: 14, textAlign: "center",
          backgroundColor: "#5BAD52", color: "#fff", borderRadius: 8,
          textDecoration: "none", fontSize: 14, fontWeight: 700,
          marginBottom: 16,
        }}
      >
        📋 物件確認リストで確認する
      </a>

      {/* 確認履歴 */}
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>確認履歴</h3>
      {loadingLogs ? (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>読み込み中...</p>
      ) : logs.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>確認履歴はありません</p>
      ) : (
        logs.map(log => (
          <div key={log.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: 8, backgroundColor: "#f9fafb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {new Date(log.checked_at).toLocaleDateString("ja-JP")}
              </span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {log.staff?.name ?? "—"}
              </span>
            </div>
            {log.old_price !== log.new_price && log.new_price != null && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "2px 0" }}>
                価格変更：{Number(log.old_price).toLocaleString()}万円 → {Number(log.new_price).toLocaleString()}万円
              </p>
            )}
            {log.note && (
              <p style={{ fontSize: 12, color: "#374151", margin: "2px 0" }}>{log.note}</p>
            )}
          </div>
        ))
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
  const [mainTab, setMainTab] = useState<"info" | "photos" | "ad_confirm" | "workflow" | "copy" | "hp" | "check">("workflow");
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 広告文タブ
  const [copyFields, setCopyFields] = useState<Record<string, string>>({});
  const [copyPoints, setCopyPoints] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copyMsg, setCopyMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [copySaving, setCopySaving] = useState(false);

  // 物件情報タブ内AI生成
  const [generatingForm, setGeneratingForm] = useState(false);

  const loadProperty = async () => {
    const res = await fetch(`/api/properties/${params.id}`);
    const d = await res.json();
    if (res.ok && d.property) {
      setProperty(d.property);
      setForm(propertyToForm(d.property));
      setCopyFields({
        title: String(d.property.title ?? ""),
        catch_copy: String(d.property.catch_copy ?? ""),
        description_hp: String(d.property.description_hp ?? ""),
        description_suumo: String(d.property.description_suumo ?? ""),
        description_athome: String(d.property.description_athome ?? ""),
      });
      setCopyPoints(Array.isArray(d.property.selling_points) ? d.property.selling_points : []);
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

  const handleGenerateToForm = async () => {
    if (!confirm("AIで広告文を生成します。現在の内容は上書きされます。よろしいですか？")) return;
    setGeneratingForm(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/properties/${params.id}/generate-content`, { method: "POST" });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(`サーバーエラー（${res.status}）`);
      }
      const d = await res.json();
      if (!res.ok) { setMsg({ text: d.error ?? "生成に失敗しました", ok: false }); return; }
      const c = d.copy;
      setForm(f => ({
        ...f,
        ...(c.title             ? { title:              c.title }             : {}),
        ...(c.catch_copy        ? { catch_copy:         c.catch_copy }        : {}),
        ...(c.description_hp    ? { description_hp:     c.description_hp }    : {}),
        ...(c.description_suumo ? { description_suumo:  c.description_suumo } : {}),
        ...(c.description_athome? { description_athome: c.description_athome }: {}),
      }));
      setMsg({ text: "✅ 広告文を生成しました。内容を確認して保存してください。", ok: true });
      setTimeout(() => setMsg(null), 8000);
    } catch (e) {
      setMsg({ text: `エラー: ${String(e)}`, ok: false });
    } finally {
      setGeneratingForm(false);
    }
  };

  const handleGenerateCopy = async () => {
    setGenerating(true);
    setCopyMsg(null);
    try {
      const res = await fetch(`/api/properties/${params.id}/generate-content`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setCopyMsg({ text: d.error ?? "生成に失敗しました", ok: false }); return; }
      const c = d.copy;
      setCopyFields({
        title: c.title ?? "",
        catch_copy: c.catch_copy ?? "",
        description_hp: c.description_hp ?? "",
        description_suumo: c.description_suumo ?? "",
        description_athome: c.description_athome ?? "",
      });
      setCopyPoints(Array.isArray(c.selling_points) ? c.selling_points : []);
      setCopyMsg({ text: "広告文を生成しました。内容を確認して「保存」してください。", ok: true });
    } catch { setCopyMsg({ text: "通信エラーが発生しました", ok: false }); }
    finally { setGenerating(false); }
  };

  const handleSaveCopy = async () => {
    setCopySaving(true);
    setCopyMsg(null);
    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copyFields,
          selling_points: copyPoints.filter(p => p.trim()),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setCopyMsg({ text: d.error ?? "保存に失敗しました", ok: false }); return; }
      setProperty(d.property);
      setCopyMsg({ text: "保存しました", ok: true });
    } catch { setCopyMsg({ text: "通信エラーが発生しました", ok: false }); }
    finally { setCopySaving(false); }
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
          ["copy", "広告文"],
          ["hp", "HP設定"],
          ["check", "物件確認"],
        ] as const).map(([t, label]) => {
          const hasCopy = !!(property.catch_copy);
          const lastChecked = property.last_checked_at ? new Date(String(property.last_checked_at)) : null;
          const checkInterval = Number(property.check_interval_days ?? 14);
          const daysSinceCheck = lastChecked ? Math.floor((Date.now() - lastChecked.getTime()) / 86_400_000) : null;
          const checkAlert = daysSinceCheck === null || daysSinceCheck >= checkInterval;
          return (
            <button key={t} onClick={() => setMainTab(t)}
              style={{ padding: "8px 20px", fontSize: 13, borderRadius: 8, border: "1px solid " + (mainTab === t ? "#234f35" : "#e0deda"), background: mainTab === t ? "#234f35" : "#fff", color: mainTab === t ? "#fff" : "#706e68", fontWeight: mainTab === t ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {label}
              {t === "workflow" && needsAdConfirm && (
                <span title="広告確認が未完了です。アクションタブで対応してください" style={{ marginLeft: 5, fontSize: 10, background: "#e65100", color: "#fff", borderRadius: 99, padding: "1px 5px" }}>!</span>
              )}
              {t === "copy" && !hasCopy && (
                <span title="広告文が未生成です" style={{ marginLeft: 5, fontSize: 10, background: "#9e9e9e", color: "#fff", borderRadius: 99, padding: "1px 5px" }}>未</span>
              )}
              {t === "check" && checkAlert && (
                <span title="確認期限が超過または未確認です" style={{ marginLeft: 5, fontSize: 10, background: "#8c1f1f", color: "#fff", borderRadius: 99, padding: "1px 5px" }}>!</span>
              )}
            </button>
          );
        })}
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
          <PropertyFormTabs
            tab={tab} setTab={setTab} form={form} setForm={setForm}
            onGenerateContent={handleGenerateToForm}
            generatingContent={generatingForm}
          />
        )}
        {mainTab === "photos" && (
          <PhotoManager
            propertyId={params.id}
            lat={property.latitude as number | null}
            lng={property.longitude as number | null}
            propertyType={String(property.property_type ?? "")}
          />
        )}
        {mainTab === "hp" && (
          <HpFlagPanel property={property} onReload={loadProperty} />
        )}
        {mainTab === "check" && (
          <CheckTab propertyId={params.id} property={property} />
        )}
        {mainTab === "copy" && (
          <div>
            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={handleGenerateCopy} disabled={generating}
                style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: generating ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {generating ? "🤖 生成中..." : "🤖 AIで広告文を生成"}
              </button>
              <button onClick={handleSaveCopy} disabled={copySaving}
                style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #234f35", color: "#234f35", cursor: "pointer", fontFamily: "inherit" }}>
                {copySaving ? "保存中..." : "保存する"}
              </button>
              <span style={{ fontSize: 11, color: "#9e9e9e" }}>生成後に内容を確認・編集してから保存してください</span>
            </div>
            {copyMsg && (
              <div style={{ background: copyMsg.ok ? "#e8f5e9" : "#fdeaea", color: copyMsg.ok ? "#1b5e20" : "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {copyMsg.text}
              </div>
            )}

            {/* Fields */}
            <CopyField
              label="タイトル" maxLen={50}
              value={copyFields.title ?? ""}
              onChange={v => setCopyFields(f => ({ ...f, title: v }))}
            />
            <CopyField
              label="キャッチコピー" maxLen={40}
              value={copyFields.catch_copy ?? ""}
              onChange={v => setCopyFields(f => ({ ...f, catch_copy: v }))}
            />
            <CopyField
              label="HP掲載文" maxLen={600} rows={8}
              value={copyFields.description_hp ?? ""}
              onChange={v => setCopyFields(f => ({ ...f, description_hp: v }))}
            />
            <CopyField
              label="SUUMO掲載文" maxLen={300} rows={5}
              value={copyFields.description_suumo ?? ""}
              onChange={v => setCopyFields(f => ({ ...f, description_suumo: v }))}
            />
            <CopyField
              label="at home掲載文" maxLen={300} rows={5}
              value={copyFields.description_athome ?? ""}
              onChange={v => setCopyFields(f => ({ ...f, description_athome: v }))}
            />

            {/* Selling points */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1b18", marginBottom: 8 }}>
                セールスポイント <span style={{ fontWeight: 400, color: "#9e9e9e" }}>（各20文字以内・5項目）</span>
              </div>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9e9e9e", width: 14 }}>{i + 1}</span>
                  <input
                    value={copyPoints[i] ?? ""}
                    onChange={e => setCopyPoints(pts => {
                      const next = [...pts];
                      while (next.length <= i) next.push("");
                      next[i] = e.target.value;
                      return next;
                    })}
                    maxLength={20}
                    placeholder={`セールスポイント${i + 1}`}
                    style={{ flex: 1, padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit" }}
                  />
                  <span style={{ fontSize: 10, color: (copyPoints[i]?.length ?? 0) > 18 ? "#e65100" : "#9e9e9e", width: 36, textAlign: "right" }}>
                    {copyPoints[i]?.length ?? 0}/20
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
