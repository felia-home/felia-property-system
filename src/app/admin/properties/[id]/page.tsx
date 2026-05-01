"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, propertyToForm, formToBody,
} from "@/components/admin/property-form-tabs";
import PhotoManager from "@/components/admin/photo-manager";
import PropertyFeaturesSection from "@/components/admin/PropertyFeaturesSection";
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
  const [mainTab, setMainTab] = useState<"info" | "photos" | "ad_confirm" | "workflow" | "copy" | "hp" | "check" | "features">("workflow");
  const [form, setForm] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresMsg, setFeaturesMsg] = useState<{ text: string; ok: boolean } | null>(null);
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

  // ジオコード
  const [geocoding, setGeocoding] = useState(false);

  // Web検索補完
  const [webEnrichLoading, setWebEnrichLoading] = useState(false);
  const [webEnrichResult, setWebEnrichResult] = useState<{
    current: Record<string, unknown>;
    enriched: Record<string, unknown>;
    query: string;
    is_mansion: boolean;
  } | null>(null);
  const [showWebEnrichModal, setShowWebEnrichModal] = useState(false);
  const [selectedEnrichFields, setSelectedEnrichFields] = useState<Set<string>>(new Set());

  // ── 資料・ドキュメント ─────────────────────────────────────
  const [documents, setDocuments] = useState<{
    id: string; name: string; url: string;
    file_type: string; memo: string | null;
  }[]>([]);
  const [docUploading, setDocUploading] = useState(false);

  // PDF画像抽出
  const [pdfImageExtracting, setPdfImageExtracting] = useState(false);
  const [pdfImages, setPdfImages] = useState<{
    index: number;
    type: string;
    type_ja: string;
    description: string;
    page: number;
    quality: string;
    recommended: boolean;
  }[]>([]);
  const [showPdfImageModal, setShowPdfImageModal] = useState(false);
  const [pdfImageSourceUrl, setPdfImageSourceUrl] = useState<string | null>(null);

  // マンション建物マスタ紐付け
  type MansionRow = {
    id: string;
    name: string;
    name_kana?: string | null;
    city?: string | null;
    address?: string | null;
    total_units?: number | null;
    floors_total?: number | null;
    floors_basement?: number | null;
    structure?: string | null;
    built_year?: number | null;
    built_month?: number | null;
    management_company?: string | null;
    management_fee?: number | null;
    repair_reserve?: number | null;
  };
  const [mansionSearch, setMansionSearch]         = useState("");
  const [mansionCandidates, setMansionCandidates] = useState<MansionRow[]>([]);
  const [linkedMansion, setLinkedMansion]         = useState<MansionRow | null>(null);

  const handleMansionSearch = async (q: string) => {
    setMansionSearch(q);
    if (q.length < 2) { setMansionCandidates([]); return; }
    try {
      const res = await fetch(`/api/mansions?name=${encodeURIComponent(q)}`);
      const data = await res.json();
      setMansionCandidates((data.mansions ?? []).slice(0, 10));
    } catch { setMansionCandidates([]); }
  };

  const handleApplyMansionData = async () => {
    if (!form.mansion_building_id) return;
    try {
      const res = await fetch(`/api/mansions/${form.mansion_building_id}`);
      const data = await res.json();
      const m: MansionRow | null = data.mansion ?? null;
      if (!m) return;
      setForm(prev => ({
        ...prev,
        total_units:        m.total_units != null         ? String(m.total_units)        : prev.total_units,
        floors_total:       m.floors_total != null        ? String(m.floors_total)       : prev.floors_total,
        floors_basement:    m.floors_basement != null     ? String(m.floors_basement)    : prev.floors_basement,
        structure:          m.structure                   ?? prev.structure,
        building_year:      m.built_year != null          ? String(m.built_year)         : prev.building_year,
        building_month:     m.built_month != null         ? String(m.built_month)        : prev.building_month,
        management_company: m.management_company          ?? prev.management_company,
        management_fee:     m.management_fee != null      ? String(m.management_fee)     : prev.management_fee,
        repair_reserve:     m.repair_reserve != null      ? String(m.repair_reserve)     : prev.repair_reserve,
        city:               prev.city    || m.city    || prev.city,
        address:            prev.address || m.address || prev.address,
      }));
      alert(`「${m.name}」のデータを反映しました`);
    } catch {
      alert("マンションデータの取得に失敗しました");
    }
  };

  // フォームの mansion_building_id が変化したら自動でリンク済みマンション情報を取得
  useEffect(() => {
    if (!form.mansion_building_id) { setLinkedMansion(null); return; }
    if (linkedMansion?.id === form.mansion_building_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mansions/${form.mansion_building_id}`);
        const data = await res.json();
        if (!cancelled) setLinkedMansion(data.mansion ?? null);
      } catch { if (!cancelled) setLinkedMansion(null); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mansion_building_id]);

  // 周辺環境写真 一括アップロード
  type PlaceCandidate = { name: string; category: string; lat: number; lng: number };
  type EnvImageItem = {
    file: File;
    previewUrl: string;
    facilityName: string;
    searchName: string;
    candidates: PlaceCandidate[];
    selectedCandidate: PlaceCandidate | null;
    searching: boolean;
    uploading: boolean;
    uploaded: boolean;
    error: string | null;
  };
  const [envImageItems, setEnvImageItems] = useState<EnvImageItem[]>([]);
  const [bulkEnvUploading, setBulkEnvUploading] = useState(false);

  const extractFacilityName = (filename: string): string => {
    let n = filename.replace(/\.[^.]+$/, "");
    n = n.replace(/^[\d_\-\s]+/, "");
    n = n.replace(/[\d_\-\s]+$/, "");
    return n.trim();
  };

  const searchPlaceCandidates = async (
    name: string,
    lat: number | string,
    lng: number | string
  ): Promise<PlaceCandidate[]> => {
    if (!name || !lat || !lng) return [];
    try {
      const res = await fetch(
        `/api/places/search?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`
      );
      const data = await res.json();
      return data.candidates ?? [];
    } catch {
      return [];
    }
  };

  const handleEnvImageFiles = async (files: FileList) => {
    const items: EnvImageItem[] = Array.from(files).map(file => ({
      file,
      previewUrl:        URL.createObjectURL(file),
      facilityName:      extractFacilityName(file.name),
      searchName:        extractFacilityName(file.name),
      candidates:        [],
      selectedCandidate: null,
      searching:         false,
      uploading:         false,
      uploaded:          false,
      error:             null,
    }));
    setEnvImageItems(prev => [...prev, ...items]);

    if (!property?.latitude || !property?.longitude) return;

    for (const item of items) {
      if (!item.searchName) continue;
      setEnvImageItems(prev => prev.map(p =>
        p.file === item.file ? { ...p, searching: true } : p
      ));
      const candidates = await searchPlaceCandidates(
        item.searchName,
        String(property.latitude),
        String(property.longitude)
      );
      setEnvImageItems(prev => prev.map(p =>
        p.file === item.file
          ? {
              ...p,
              searching: false,
              candidates,
              selectedCandidate: candidates.find(c => c.name === item.searchName) ?? null,
            }
          : p
      ));
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const handleBulkEnvUpload = async () => {
    setBulkEnvUploading(true);
    try {
      for (const item of envImageItems) {
        if (item.uploaded) continue;

        setEnvImageItems(prev => prev.map(p =>
          p.file === item.file ? { ...p, uploading: true, error: null } : p
        ));

        try {
          const candidate = item.selectedCandidate;
          const fd = new FormData();
          fd.append("file", item.file);
          fd.append("facility_name", candidate?.name || item.facilityName);
          if (candidate?.lat) fd.append("latitude", String(candidate.lat));
          if (candidate?.lng) fd.append("longitude", String(candidate.lng));

          const res = await fetch(`/api/properties/${params.id}/env-images`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          setEnvImageItems(prev => prev.map(p =>
            p.file === item.file ? { ...p, uploading: false, uploaded: true } : p
          ));
        } catch (err) {
          console.error("env image upload failed:", err);
          setEnvImageItems(prev => prev.map(p =>
            p.file === item.file ? { ...p, uploading: false, error: "失敗" } : p
          ));
        }
      }
    } finally {
      setBulkEnvUploading(false);
    }
  };

  const loadDocuments = async (propId: string) => {
    try {
      const res = await fetch(`/api/properties/${propId}/documents`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch { /* ignore */ }
  };

  const loadProperty = async () => {
    const res = await fetch(`/api/properties/${params.id}`);
    const d = await res.json();
    if (res.ok && d.property) {
      setProperty(d.property);
      setForm(propertyToForm(d.property));
      setFeatures(Array.isArray(d.property.features) ? d.property.features : []);
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
    loadDocuments(params.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) { setMsg({ text: "アップロードに失敗しました", ok: false }); return; }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType = ["pdf"].includes(ext) ? "pdf"
        : ["png","jpg","jpeg","webp","gif"].includes(ext) ? "image" : "other";
      const defaultName = file.name.replace(/\.[^.]+$/, "");
      const name = window.prompt("資料名を入力してください", defaultName) ?? defaultName;

      await fetch(`/api/properties/${params.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url: uploadData.url, file_type: fileType }),
      });
      await loadDocuments(params.id);
      setMsg({ text: `「${name}」を追加しました`, ok: true });
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      console.error("document upload error:", err);
      setMsg({ text: "資料のアップロードに失敗しました", ok: false });
    } finally {
      setDocUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!window.confirm(`「${docName}」を削除しますか？`)) return;
    try {
      await fetch(`/api/properties/${params.id}/documents?docId=${docId}`, { method: "DELETE" });
      await loadDocuments(params.id);
    } catch (err) {
      console.error("document delete error:", err);
      setMsg({ text: "削除に失敗しました", ok: false });
    }
  };

  const handleExtractPdfImages = async () => {
    const adFile = property?.ad_confirmation_file ? String(property.ad_confirmation_file) : null;
    const pdfDoc = documents.find(d => d.file_type === "pdf");
    const pdfUrl = adFile ?? pdfDoc?.url ?? null;

    if (!pdfUrl) {
      alert("先にPDFをアップロードしてください");
      return;
    }

    setPdfImageExtracting(true);
    setPdfImages([]);
    setPdfImageSourceUrl(pdfUrl);
    try {
      const res = await fetch(`/api/properties/${params.id}/extract-pdf-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_url: pdfUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setPdfImages(data.images ?? []);
        setShowPdfImageModal(true);
      } else {
        alert(data.error ?? "PDF解析に失敗しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setPdfImageExtracting(false);
    }
  };

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
      await loadDocuments(params.id);
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

  // 国土地理院API用クエリ生成（日本語住所そのまま・丁目変換不要）
  const buildAddressQueries = (): string[] => {
    const pref = form.prefecture ?? "東京都";
    const city = form.city ?? "";
    const town = form.town ?? "";
    const address = form.address ?? "";
    const queries = [
      [pref, city, town, address].filter(Boolean).join(""),
      [city, town, address].filter(Boolean).join(""),
      [pref, city, town].filter(Boolean).join(""),
    ];
    return [...new Set(queries)].filter(Boolean);
  };

  // 国土地理院 住所検索API でフォールバック
  // レスポンス: [{ geometry: { coordinates: [lng, lat] }, properties: { title } }]
  const tryGeocode = async (queries: string[]): Promise<{ lat: number; lng: number } | null> => {
    for (const q of queries) {
      console.log("🔍 geocode trying:", q);
      try {
        const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const data = await res.json() as Array<{ geometry: { coordinates: [number, number] } }>;
        console.log("🔍 geocode result for", q, ":", data);
        if (data && data.length > 0) {
          const [lng, lat] = data[0].geometry.coordinates; // 国土地理院は [lng, lat] 順
          return { lat, lng };
        }
      } catch (e) {
        console.error("geocode error for", q, ":", e);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    return null;
  };

  // 住所変更時に自動でジオコード（緯度経度が未設定の場合のみ）
  // 800ms debounce、city/town/address のいずれかが変化したら発火
  useEffect(() => {
    if (form.latitude && form.longitude) return; // 既に座標があれば自動取得しない
    if (!form.city || (form.city.length < 2)) return;

    const timer = setTimeout(async () => {
      const queries = buildAddressQueries();
      if (queries.length === 0 || !queries[0]) return;
      const result = await tryGeocode(queries);
      if (result) {
        setForm(f => {
          if (f.latitude && f.longitude) return f; // 取得中に手動入力された場合は上書きしない
          return { ...f, latitude: String(result.lat), longitude: String(result.lng) };
        });
      }
    }, 800);

    return () => clearTimeout(timer);
    // buildAddressQueries / tryGeocode は安定なため deps に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, form.town, form.address]);

  const handleGeocodeAndEnrich = async () => {
    const queries = buildAddressQueries();
    console.log("🔍 geocode queries:", queries);

    if (queries.length === 0 || !queries[0]) {
      setMsg({ text: "住所（都道府県・区市町村・番地）を入力してください", ok: false });
      return;
    }

    setGeocoding(true);
    setMsg(null);

    try {
      // Step 1: フォールバック付きジオコード
      const result = await tryGeocode(queries);
      if (!result) {
        setMsg({ text: "住所から緯度経度を取得できませんでした。住所を確認してください。", ok: false });
        return;
      }

      const { lat, lng } = result;
      console.log("🔍 geocode lat/lng:", lat, lng);

      // Step 2: フォームに反映
      setForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }));

      // Step 3: DBに lat/lng + 住所関連フィールドを保存
      // （loadProperty() 後にフォームがリセットされても住所が消えないよう一緒に保存）
      await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          address: form.address ?? "",
          town:    form.town    ?? "",
          city:    form.city    ?? "",
        }),
      });

      // Step 4: auto-enrich（最寄り駅・学区・周辺環境写真）
      const enrichRes = await fetch(`/api/properties/${params.id}/auto-enrich`, { method: "POST" });
      const enrichData = await enrichRes.json();
      console.log("🔍 enrich result:", enrichData);

      // enrichData に学校情報があればフォームに即時反映（loadProperty より先に反映）
      // UI入力欄は env_elementary_school / env_junior_high_school にバインド
      const schoolData = enrichData.schools ?? enrichData.results?.school;
      if (schoolData?.elementary) {
        setForm(f => ({
          ...f,
          school_elementary:     schoolData.elementary,
          env_elementary_school: f.env_elementary_school || schoolData.elementary,
        }));
      }
      if (schoolData?.juniorHigh) {
        setForm(f => ({
          ...f,
          school_junior_high:     schoolData.juniorHigh,
          env_junior_high_school: f.env_junior_high_school || schoolData.juniorHigh,
        }));
      }

      // 駅情報を常に上書き反映（誤った既存データを最新の自動取得結果で更新）
      const stationData: { line?: string; name?: string; walk_minutes?: number }[] =
        enrichData.stations ?? enrichData.results?.stations ?? [];
      if (Array.isArray(stationData) && stationData.length > 0) {
        setForm(f => ({
          ...f,
          station_line1: stationData[0]?.line ?? "",
          station_name1: stationData[0]?.name ?? "",
          station_walk1: stationData[0]?.walk_minutes != null ? String(stationData[0].walk_minutes) : "",
          station_line2: stationData[1]?.line ?? "",
          station_name2: stationData[1]?.name ?? "",
          station_walk2: stationData[1]?.walk_minutes != null ? String(stationData[1].walk_minutes) : "",
          station_line3: stationData[2]?.line ?? "",
          station_name3: stationData[2]?.name ?? "",
          station_walk3: stationData[2]?.walk_minutes != null ? String(stationData[2].walk_minutes) : "",
        }));
      }

      // Step 5: DB から再取得してフォームをリロード
      await loadProperty();

      const enrichMsg = enrichRes.ok
        ? (enrichData.message ?? "補完完了")
        : `補完スキップ: ${enrichData.error ?? "エラー"}`;
      setMsg({ text: `✅ 緯度経度を取得しました。${enrichMsg}`, ok: true });
      setTimeout(() => setMsg(null), 8000);
    } catch (e) {
      console.error("geocode error:", e);
      setMsg({ text: `エラーが発生しました: ${String(e)}`, ok: false });
    } finally {
      setGeocoding(false);
    }
  };

  const handleWebEnrich = async () => {
    setWebEnrichLoading(true);
    try {
      const res = await fetch(`/api/properties/${params.id}/web-enrich`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Web検索に失敗しました"); return; }
      if (data.enriched) {
        setWebEnrichResult(data);
        setShowWebEnrichModal(true);
        const fields = Object.keys(data.enriched).filter(
          k => k !== "sources" && data.enriched[k] !== null
        );
        setSelectedEnrichFields(new Set(fields));
      }
    } catch {
      alert("Web検索に失敗しました");
    } finally {
      setWebEnrichLoading(false);
    }
  };

  const handleApplyEnriched = () => {
    if (!webEnrichResult) return;
    const patch: Record<string, unknown> = {};
    for (const key of selectedEnrichFields) {
      if (webEnrichResult.enriched[key] !== null) {
        patch[key] = webEnrichResult.enriched[key];
      }
    }
    // form は文字列 Record なので文字列変換して反映
    setForm(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        next[k] = v == null ? "" : String(v);
      }
      return next;
    });
    setShowWebEnrichModal(false);
    setMsg({ text: "✅ 反映しました。「保存する」で確定してください。", ok: true });
    setTimeout(() => setMsg(null), 8000);
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
          {property.ad_confirmation_file && (
            <a
              href={String(property.ad_confirmation_file)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 12,
                background: "#fff", border: "1px solid #d1d5db",
                color: "#374151", fontWeight: 600, textDecoration: "none",
                cursor: "pointer",
              }}
            >
              📄 広告確認PDF
            </a>
          )}
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
          ["features", "設備・仕様"],
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
          <div>
            <ActionPanel
              property={property}
              onStatusChange={handleStatusChange}
              onOpenTab={(t) => setMainTab(t)}
            />

            {/* 資料・ドキュメント管理 */}
            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
                  📎 資料・ドキュメント
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleExtractPdfImages}
                    disabled={pdfImageExtracting}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 6, fontSize: 12,
                      background: pdfImageExtracting ? "#e5e7eb" : "#fef9c3",
                      border: "1px solid #fde68a",
                      color: pdfImageExtracting ? "#9ca3af" : "#92400e",
                      fontWeight: 700,
                      cursor: pdfImageExtracting ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {pdfImageExtracting ? "🔍 解析中..." : "🖼️ PDFから画像を抽出"}
                  </button>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 6, fontSize: 12,
                    background: docUploading ? "#e5e7eb" : "#f0fdf4",
                    border: "1px solid #86efac", color: "#166534",
                    fontWeight: 700, cursor: docUploading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}>
                    {docUploading ? "アップロード中..." : "＋ 資料を追加"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                      style={{ display: "none" }}
                      disabled={docUploading}
                      onChange={handleDocumentUpload}
                    />
                  </label>
                </div>
              </div>

              {/* 広告確認PDF（既存） */}
              {property.ad_confirmation_file && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", border: "1px solid #e5e7eb",
                  borderRadius: 6, marginBottom: 6, background: "#fafafa",
                }}>
                  <span>📄</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    広告確認PDF
                  </div>
                  <a
                    href={String(property.ad_confirmation_file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 4,
                      background: "#eff6ff", color: "#1d4ed8",
                      border: "1px solid #bfdbfe", textDecoration: "none",
                    }}
                  >
                    開く
                  </a>
                </div>
              )}

              {/* アップロード済み資料一覧 */}
              {documents.map(doc => (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", border: "1px solid #e5e7eb",
                  borderRadius: 6, marginBottom: 6, background: "#fff",
                }}>
                  <span>
                    {doc.file_type === "pdf" ? "📄" : doc.file_type === "image" ? "🖼️" : "📎"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{doc.name}</div>
                    {doc.memo && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{doc.memo}</div>
                    )}
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 4,
                      background: "#eff6ff", color: "#1d4ed8",
                      border: "1px solid #bfdbfe", textDecoration: "none",
                    }}
                  >
                    開く
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    style={{
                      fontSize: 12, padding: "4px 8px", borderRadius: 4,
                      background: "#fff", color: "#ef4444",
                      border: "1px solid #fca5a5", cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    削除
                  </button>
                </div>
              ))}

              {documents.length === 0 && !property.ad_confirmation_file && (
                <div style={{
                  textAlign: "center", padding: 20,
                  color: "#9ca3af", fontSize: 12,
                  border: "1px dashed #e5e7eb", borderRadius: 6,
                }}>
                  資料が登録されていません。「＋ 資料を追加」からPDFや画像をアップロードできます。
                </div>
              )}
            </div>

            {/* 周辺環境写真 一括アップロード */}
            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
                  🏙️ 周辺環境写真（一括アップロード）
                </span>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6, fontSize: 12,
                  background: "#f0fdf4", border: "1px solid #86efac",
                  color: "#166534", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>
                  ＋ 複数枚を選択
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={e => e.target.files && handleEnvImageFiles(e.target.files)}
                  />
                </label>
              </div>

              {(!property.latitude || !property.longitude) && envImageItems.length > 0 && (
                <div style={{
                  padding: 10, marginBottom: 10, borderRadius: 6,
                  background: "#fffbeb", border: "1px solid #fde68a",
                  fontSize: 12, color: "#92400e",
                }}>
                  ⚠ 物件の緯度経度が未設定です。先に「住所から緯度経度を取得」で座標を取得してください。
                </div>
              )}

              {envImageItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {envImageItems.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", gap: 12, padding: 12,
                      border: `1px solid ${item.uploaded ? "#86efac" : "#e5e7eb"}`,
                      borderRadius: 8,
                      background: item.uploaded ? "#f0fdf4" : "#fff",
                    }}>
                      <img
                        src={item.previewUrl}
                        alt=""
                        style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <input
                            type="text"
                            value={item.searchName}
                            onChange={e => {
                              const val = e.target.value;
                              setEnvImageItems(prev => prev.map((p, i) =>
                                i === idx ? { ...p, searchName: val } : p
                              ));
                            }}
                            placeholder="施設名"
                            style={{
                              flex: 1, padding: "5px 8px",
                              border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13,
                              fontFamily: "inherit", boxSizing: "border-box",
                            }}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!property.latitude || !property.longitude) return;
                              setEnvImageItems(prev => prev.map((p, i) =>
                                i === idx ? { ...p, searching: true, candidates: [] } : p
                              ));
                              const candidates = await searchPlaceCandidates(
                                item.searchName,
                                String(property.latitude),
                                String(property.longitude)
                              );
                              setEnvImageItems(prev => prev.map((p, i) =>
                                i === idx ? { ...p, searching: false, candidates } : p
                              ));
                            }}
                            disabled={item.searching}
                            style={{
                              padding: "5px 10px", borderRadius: 6, fontSize: 12,
                              border: "1px solid #d1d5db", background: "#fff",
                              cursor: item.searching ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {item.searching ? "🔍..." : "🔍 再検索"}
                          </button>
                        </div>

                        {item.candidates.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {item.candidates.map((c, ci) => (
                              <button
                                key={ci}
                                type="button"
                                onClick={() => setEnvImageItems(prev => prev.map((p, i) =>
                                  i === idx ? { ...p, selectedCandidate: c } : p
                                ))}
                                style={{
                                  padding: "3px 10px", borderRadius: 12, fontSize: 11,
                                  border: `1px solid ${item.selectedCandidate?.name === c.name ? "#86efac" : "#e5e7eb"}`,
                                  background: item.selectedCandidate?.name === c.name ? "#f0fdf4" : "#f9fafb",
                                  color: "#374151", cursor: "pointer",
                                  fontWeight: item.selectedCandidate?.name === c.name ? "bold" : "normal",
                                  fontFamily: "inherit",
                                }}
                              >
                                {c.name}
                                {c.category && <span style={{ color: "#9ca3af", marginLeft: 4 }}>({c.category})</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {item.candidates.length === 0 && !item.searching && item.searchName && (
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            候補なし — 施設名を変更して再検索してください
                          </div>
                        )}

                        {item.selectedCandidate && (
                          <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>
                            ✅ {item.selectedCandidate.name}（座標取得済み）
                          </div>
                        )}

                        {item.error && (
                          <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                            ❌ {item.error}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", minWidth: 60, justifyContent: "center" }}>
                        {item.uploaded
                          ? <span style={{ fontSize: 20 }}>✅</span>
                          : item.uploading
                            ? <span style={{ fontSize: 12, color: "#9ca3af" }}>送信中...</span>
                            : <button
                                type="button"
                                onClick={() => setEnvImageItems(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                  background: "none", border: "none",
                                  color: "#9ca3af", cursor: "pointer", fontSize: 18,
                                  fontFamily: "inherit",
                                }}
                              >✕</button>
                        }
                      </div>
                    </div>
                  ))}

                  {envImageItems.some(i => !i.uploaded) && (
                    <button
                      type="button"
                      onClick={handleBulkEnvUpload}
                      disabled={bulkEnvUploading}
                      style={{
                        padding: "10px 20px", borderRadius: 6, border: "none",
                        background: bulkEnvUploading ? "#e5e7eb" : "#5BAD52",
                        color: bulkEnvUploading ? "#9ca3af" : "#fff",
                        fontSize: 13, fontWeight: "bold",
                        cursor: bulkEnvUploading ? "not-allowed" : "pointer",
                        alignSelf: "flex-end", fontFamily: "inherit",
                      }}
                    >
                      {bulkEnvUploading
                        ? "アップロード中..."
                        : `📤 ${envImageItems.filter(i => !i.uploaded).length}件をまとめて登録`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {mainTab === "info" && (
          <div>
            {/* マンション建物マスタとの紐付け（マンション系のみ） */}
            {(form.property_type === "MANSION" || form.property_type === "NEW_MANSION") && (
              <div style={{ marginBottom: 16, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 6 }}>
                  🏢 マンション建物マスタと紐付け
                </label>
                {form.mansion_building_id ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: "#f0fdf4",
                    border: "1px solid #86efac", borderRadius: 8,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: "bold" }}>
                      🏢 {linkedMansion?.name ?? "紐付け済み"}
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyMansionData}
                      style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 12,
                        border: "none", background: "#5BAD52", color: "#fff",
                        cursor: "pointer", fontFamily: "inherit", fontWeight: "bold",
                      }}
                    >
                      📋 データを反映
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, mansion_building_id: "" }));
                        setLinkedMansion(null);
                      }}
                      style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 12,
                        border: "1px solid #fca5a5", background: "#fff",
                        color: "#ef4444", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      解除
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="マンション名で検索（2文字以上）..."
                      value={mansionSearch}
                      onChange={e => handleMansionSearch(e.target.value)}
                      style={{
                        width: "100%", padding: "8px 10px",
                        border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13,
                        boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    />
                    {mansionCandidates.length > 0 && (
                      <div style={{
                        border: "1px solid #e5e7eb", borderRadius: 6,
                        maxHeight: 200, overflowY: "auto", marginTop: 4,
                        background: "#fff",
                      }}>
                        {mansionCandidates.map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setForm(prev => ({ ...prev, mansion_building_id: m.id }));
                              setLinkedMansion(m);
                              setMansionCandidates([]);
                              setMansionSearch("");
                            }}
                            style={{
                              padding: "10px 14px", cursor: "pointer", fontSize: 13,
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <div style={{ fontWeight: "bold" }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {m.city ?? ""}{m.address ?? ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <button
                type="button"
                onClick={handleWebEnrich}
                disabled={webEnrichLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 6, fontSize: 13,
                  background: webEnrichLoading ? "#e5e7eb" : "#eff6ff",
                  color: webEnrichLoading ? "#9ca3af" : "#1d4ed8",
                  border: "1px solid #bfdbfe", fontWeight: 600,
                  cursor: webEnrichLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {webEnrichLoading ? "🔍 検索中..." : "🌐 Web検索で情報を補完"}
              </button>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>マンション名・管理会社・修繕積立金などをWebから自動取得</span>
            </div>
            <PropertyFormTabs
              tab={tab} setTab={setTab} form={form} setForm={setForm}
              onGenerateContent={handleGenerateToForm}
              generatingContent={generatingForm}
              onGeocode={handleGeocodeAndEnrich}
              geocoding={geocoding}
            />
          </div>
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
        {mainTab === "features" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>設備・仕様</h2>
                <p style={{ fontSize: 12, color: "#706e68", margin: 0 }}>
                  ポータルサイトへの連携項目を選択します。バッジ（S/A/Y）はSUUMO / athome / Yahoo! に対応。
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {featuresMsg && (
                  <span style={{ fontSize: 13, color: featuresMsg.ok ? "#1b5e20" : "#8c1f1f" }}>
                    {featuresMsg.text}
                  </span>
                )}
                <button
                  onClick={async () => {
                    setFeaturesSaving(true);
                    setFeaturesMsg(null);
                    try {
                      const res = await fetch(`/api/properties/${params.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ features }),
                      });
                      const d = await res.json();
                      if (res.ok) {
                        setProperty(d.property);
                        setFeaturesMsg({ text: "✅ 保存しました", ok: true });
                        setTimeout(() => setFeaturesMsg(null), 3000);
                      } else {
                        setFeaturesMsg({ text: d.error ?? "保存に失敗しました", ok: false });
                      }
                    } catch {
                      setFeaturesMsg({ text: "通信エラーが発生しました", ok: false });
                    } finally {
                      setFeaturesSaving(false);
                    }
                  }}
                  disabled={featuresSaving}
                  style={{
                    padding: "9px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: featuresSaving ? "#888" : "#234f35",
                    color: "#fff", border: "none",
                    cursor: featuresSaving ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {featuresSaving ? "保存中..." : "💾 保存する"}
                </button>
              </div>
            </div>
            <PropertyFeaturesSection
              selectedFeatures={features}
              onChange={setFeatures}
            />
          </div>
        )}
        {mainTab === "check" && (
          <CheckTab propertyId={params.id} property={property} />
        )}
        {/* Web検索補完モーダル */}
        {showWebEnrichModal && webEnrichResult && (() => {
          const ALL_ENRICHABLE = [
            { key: "building_name",      label: "マンション名" },
            { key: "building_year",      label: "築年" },
            { key: "building_month",     label: "築月" },
            { key: "total_units",        label: "総戸数" },
            { key: "floors_total",       label: "総階数" },
            { key: "management_company", label: "管理会社" },
            { key: "management_type",    label: "管理形態" },
            { key: "repair_reserve",     label: "修繕積立金（月額）" },
            { key: "management_fee",     label: "管理費（月額）" },
            { key: "structure",          label: "構造" },
          ];
          const enrichableFields = ALL_ENRICHABLE.filter(
            f => f.key in webEnrichResult.enriched && webEnrichResult.enriched[f.key] !== null
          );
          return (
            <div style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "flex-start", justifyContent: "center",
              overflowY: "auto", padding: "40px 16px",
            }}>
              <div style={{
                background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640,
                padding: 32, position: "relative", margin: "auto",
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  🌐 Web検索結果
                </h2>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
                  検索: {webEnrichResult.query}
                </p>

                {enrichableFields.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>
                    反映できる情報が見つかりませんでした。
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {enrichableFields.map(({ key, label }) => {
                      const newVal = webEnrichResult.enriched[key] as string | number | null;
                      const currentVal = (webEnrichResult.current as Record<string, string | number | null>)[key];
                      return (
                        <label key={key} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", border: "1px solid #e5e7eb",
                          borderRadius: 8, cursor: "pointer",
                          background: selectedEnrichFields.has(key) ? "#eff6ff" : "#fff",
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedEnrichFields.has(key)}
                            onChange={e => {
                              const next = new Set(selectedEnrichFields);
                              e.target.checked ? next.add(key) : next.delete(key);
                              setSelectedEnrichFields(next);
                            }}
                            style={{ width: 16, height: 16, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                              {label}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 12 }}>
                              <span style={{ color: "#9ca3af" }}>
                                現在: {currentVal != null ? String(currentVal) : "未設定"}
                              </span>
                              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>
                                → {String(newVal)}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {Array.isArray(webEnrichResult.enriched.sources) && webEnrichResult.enriched.sources.length > 0 && (
                  <div style={{ marginBottom: 20, fontSize: 11, color: "#6b7280" }}>
                    情報源: {(webEnrichResult.enriched.sources as string[]).join(", ")}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowWebEnrichModal(false)}
                    style={{
                      padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db",
                      background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyEnriched}
                    disabled={selectedEnrichFields.size === 0}
                    style={{
                      padding: "8px 20px", borderRadius: 6, border: "none",
                      background: selectedEnrichFields.size === 0 ? "#9ca3af" : "#1d4ed8",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: selectedEnrichFields.size === 0 ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    選択した項目を反映する
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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

      {/* PDF画像抽出結果モーダル */}
      {showPdfImageModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          overflowY: "auto", padding: "40px 16px",
        }}>
          <div style={{
            background: "#fff", borderRadius: 12,
            width: "100%", maxWidth: 700,
            padding: 32, margin: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#374151", margin: 0 }}>
                📄 PDF内の画像一覧（{pdfImages.length}件）
              </h2>
              <button
                type="button"
                onClick={() => setShowPdfImageModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280", fontFamily: "inherit" }}
              >
                ✕
              </button>
            </div>

            {pdfImages.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                PDFから画像を検出できませんでした
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pdfImages.map(img => (
                  <div key={img.index} style={{
                    display: "flex", gap: 12, padding: 12,
                    border: "1px solid #e5e7eb", borderRadius: 8,
                    background: img.recommended ? "#f0fdf4" : "#fff",
                  }}>
                    <div style={{ minWidth: 80, textAlign: "center" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>
                        {img.type === "floorplan" ? "📐"
                          : img.type === "exterior" ? "🏠"
                          : img.type === "interior" ? "🛋️"
                          : img.type === "map" ? "🗺️" : "📎"}
                      </div>
                      <div style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 8,
                        background: "#eff6ff", color: "#1d4ed8", fontWeight: "bold",
                        display: "inline-block",
                      }}>
                        {img.type_ja}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                        {img.page}ページ
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#374151", marginBottom: 6, lineHeight: 1.5 }}>
                        {img.description}
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, flexWrap: "wrap" }}>
                        <span style={{
                          padding: "1px 6px", borderRadius: 8,
                          background: img.quality === "high" ? "#dcfce7"
                            : img.quality === "medium" ? "#fef9c3" : "#fee2e2",
                          color: img.quality === "high" ? "#166534"
                            : img.quality === "medium" ? "#92400e" : "#991b1b",
                        }}>
                          画質: {img.quality === "high" ? "高" : img.quality === "medium" ? "中" : "低"}
                        </span>
                        {img.recommended && (
                          <span style={{
                            padding: "1px 6px", borderRadius: 8,
                            background: "#dcfce7", color: "#166534",
                          }}>
                            ✅ 掲載推奨
                          </span>
                        )}
                      </div>
                    </div>

                    {pdfImageSourceUrl && (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <a
                          href={`${pdfImageSourceUrl}#page=${img.page}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12, padding: "6px 12px", borderRadius: 6,
                            background: "#eff6ff", color: "#1d4ed8",
                            border: "1px solid #bfdbfe", textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          PDFで確認
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, padding: 12, background: "#fef9c3", borderRadius: 6, fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
              💡 PDFビューアーで該当ページを開いてスクリーンショットを撮り、「写真管理」タブからアップロードしてください。
              高解像度での抽出はブラウザの印刷機能（PDF→画像保存）も利用できます。
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowPdfImageModal(false)}
                style={{
                  padding: "8px 20px", borderRadius: 6,
                  border: "1px solid #d1d5db", background: "#fff",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
