"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PropertyFormTabs, propertyToForm, formToBody,
} from "@/components/admin/property-form-tabs";
import PhotoManager from "@/components/admin/photo-manager";
import { getStatusDef } from "@/lib/workflow-status";
import { generateChecklist, calculateCompletionScore } from "@/lib/property-checklist";

// ── Status transition map ─────────────────────────────────────────────────────

const STATUS_ACTIONS: Record<string, { label: string; next: string; danger?: boolean }[]> = {
  DRAFT:        [{ label: "広告確認へ進む", next: "AD_PENDING" }],
  AD_PENDING:   [{ label: "確認書を送付済みにする", next: "AD_SENT" }],
  AD_SENT:      [{ label: "広告OKで確定", next: "AD_OK" }, { label: "広告NG", next: "AD_NG", danger: true }],
  AD_OK:        [{ label: "掲載準備へ", next: "PUBLISHING" }],
  AD_NG:        [{ label: "下書きに戻す", next: "DRAFT" }],
  PHOTO_NEEDED: [{ label: "写真確認済み・掲載準備へ", next: "PUBLISHING" }],
  PUBLISHING:   [{ label: "掲載開始", next: "PUBLISHED" }],
  PUBLISHED:    [{ label: "成約アラート", next: "SOLD_ALERT", danger: true }],
  CONTENT_CHECK:[{ label: "掲載再開", next: "PUBLISHED" }],
  SOLD_ALERT:   [{ label: "成約確定", next: "SOLD", danger: true }, { label: "掲載継続", next: "PUBLISHED" }],
  SOLD:         [{ label: "掲載終了にする", next: "CLOSED", danger: true }],
};

// ── Ad Confirmation Tab ───────────────────────────────────────────────────────

interface AdConfirmTabProps {
  property: Record<string, unknown>;
  onStatusChange: (next: string, metadata?: Record<string, string>) => Promise<void>;
}

function AdConfirmTab({ property, onStatusChange }: AdConfirmTabProps) {
  const status = String(property.status ?? "DRAFT");
  const def = getStatusDef(status);
  const [method, setMethod] = useState((property.ad_confirmation_method as string) ?? "FAX");
  const [confirmedBy, setConfirmedBy] = useState((property.ad_confirmed_by as string) ?? "");
  const [saving, setSaving] = useState(false);

  const canSend = ["AD_PENDING"].includes(status);
  const canConfirm = ["AD_SENT"].includes(status);
  const alreadyConfirmed = !!property.ad_confirmed_at;

  const daysSinceSent = property.ad_confirmation_sent_at
    ? Math.floor((Date.now() - new Date(String(property.ad_confirmation_sent_at)).getTime()) / 86_400_000)
    : null;

  const handleMarkSent = async () => {
    setSaving(true);
    await onStatusChange("AD_SENT", { method });
    setSaving(false);
  };

  const handleConfirm = async (ok: boolean) => {
    if (!ok && !confirm("広告NGで確定します。この物件の広告掲載を取りやめますか？")) return;
    setSaving(true);
    await onStatusChange(ok ? "AD_OK" : "AD_NG", { confirmed_by: confirmedBy });
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Current status */}
      <div style={{ background: def.bg, border: `1px solid ${def.color}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{def.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: def.color }}>{def.label}</div>
          <div style={{ fontSize: 12, color: "#706e68" }}>{def.description}</div>
        </div>
      </div>

      {/* STEP 1: 確認書送付 */}
      {(status !== "DRAFT" && status !== "CLOSED") && (
        <div style={{ background: "#fff", border: "1px solid #e0deda", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#3a2a1a", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #f2f1ed" }}>
            STEP 1: 広告確認書の送付
          </div>

          {property.ad_confirmation_sent_at ? (
            <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#1b5e20" }}>
              ✅ 送付済み — {new Date(String(property.ad_confirmation_sent_at)).toLocaleDateString("ja-JP")}（{String(property.ad_confirmation_method ?? "不明")}）
              {daysSinceSent !== null && daysSinceSent >= 3 && (
                <span style={{ marginLeft: 8, background: "#fff0e0", color: "#e65100", padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  ⚠️ {daysSinceSent}日経過
                </span>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 6 }}>送付方法</label>
                <div style={{ display: "flex", gap: 16 }}>
                  {[["FAX", "FAX"], ["EMAIL", "メール"], ["VISIT", "持参"]] .map(([v, l]) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleMarkSent} disabled={saving || !canSend}
                style={{ padding: "8px 20px", borderRadius: 8, background: canSend ? "#234f35" : "#aaa", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: canSend ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {saving ? "処理中..." : "✈️ 送付済みとしてマーク"}
              </button>
              {!canSend && (
                <p style={{ fontSize: 11, color: "#888", marginTop: 6 }}>「広告確認へ進む」ボタンで先にステータスを進めてください。</p>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 2: 承諾確認 */}
      {(canConfirm || alreadyConfirmed) && (
        <div style={{ background: "#fff", border: "1px solid #e0deda", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#3a2a1a", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #f2f1ed" }}>
            STEP 2: 広告承諾の確認
          </div>

          {alreadyConfirmed ? (
            <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1b5e20" }}>
              ✅ 広告OK確認済み — {new Date(String(property.ad_confirmed_at)).toLocaleDateString("ja-JP")}
              {property.ad_confirmed_by && <span style={{ marginLeft: 8 }}>（{String(property.ad_confirmed_by)}）</span>}
            </div>
          ) : (
            <>
              {daysSinceSent !== null && daysSinceSent >= 3 && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#8a5200" }}>
                  ⚠️ 送付から{daysSinceSent}日経過しています。リマインドの送付を検討してください。
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#5a4a3a", display: "block", marginBottom: 6 }}>確認相手（元付業者担当者名）</label>
                <input type="text" value={confirmedBy} onChange={e => setConfirmedBy(e.target.value)}
                  placeholder="田中様（元付業者担当者名）"
                  style={{ border: "1px solid #e0deda", borderRadius: 7, padding: "7px 11px", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleConfirm(true)} disabled={saving}
                  style={{ padding: "8px 20px", borderRadius: 8, background: "#234f35", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  ✅ 広告OKで確定
                </button>
                <button onClick={() => handleConfirm(false)} disabled={saving}
                  style={{ padding: "8px 20px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  ❌ 広告NGで確定
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {status === "DRAFT" && (
        <div style={{ background: "#f8f6f3", borderRadius: 10, padding: 16, fontSize: 13, color: "#706e68" }}>
          上部の「広告確認へ進む」ボタンを押して広告確認フローを開始してください。
        </div>
      )}

      {/* Seller info reminder */}
      {(canSend || canConfirm || status === "AD_PENDING") && (
        <div style={{ marginTop: 16, background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: 14, fontSize: 12, color: "#8a5200" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>元付業者情報</div>
          <div>会社: {String(property.seller_company ?? "未入力")}</div>
          <div>連絡先: {String(property.seller_contact ?? "未入力")}</div>
          {(!property.seller_company || !property.seller_contact) && (
            <div style={{ marginTop: 6, color: "#c62828", fontWeight: 600 }}>⚠️ 元付業者情報が未入力です。物件情報タブ→業者情報で入力してください。</div>
          )}
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
  const [mainTab, setMainTab] = useState<"info" | "photos" | "ad_confirm">("info");
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then(r => r.json())
      .then(d => {
        setProperty(d.property);
        setForm(propertyToForm(d.property ?? {}));
      })
      .catch(() => setMsg({ text: "物件情報の取得に失敗しました", ok: false }))
      .finally(() => setLoading(false));
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
    const def = getStatusDef(next);
    const isDanger = ["AD_NG", "SOLD", "CLOSED"].includes(next);
    if (isDanger && !confirm(`「${def.label}」に変更します。よろしいですか？`)) return;

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
        setTimeout(() => setMsg(null), 5000);
      }
    } else {
      setMsg({ text: data.error ?? "更新に失敗しました", ok: false });
    }
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!property) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>物件が見つかりません</div>;

  const status = String(property.status ?? "DRAFT");
  const def = getStatusDef(status);
  const actions = STATUS_ACTIONS[status] ?? [];

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
            <span style={{ background: def.bg, color: def.color, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
              {def.icon} {def.label}
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
          {actions.map(a => (
            <button key={a.next} onClick={() => handleStatusChange(a.next)}
              style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: a.danger ? "#8c1f1f" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {a.label}
            </button>
          ))}
          {!editing ? (
            <button onClick={() => setEditing(true)}
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

      {/* Completion meter */}
      <CompletionMeter property={property} onTabSwitch={t => setMainTab(t)} />

      {/* Main tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {([
          ["info", "物件情報"],
          ["photos", "写真管理"],
          ["ad_confirm", "広告確認"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setMainTab(t)}
            style={{ padding: "8px 20px", fontSize: 13, borderRadius: 8, border: "1px solid " + (mainTab === t ? "#234f35" : "#e0deda"), background: mainTab === t ? "#234f35" : "#fff", color: mainTab === t ? "#fff" : "#706e68", fontWeight: mainTab === t ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
            {t === "ad_confirm" && !property.ad_confirmed_at && status !== "DRAFT" && (
              <span style={{ marginLeft: 5, fontSize: 10, background: "#e65100", color: "#fff", borderRadius: 99, padding: "1px 5px" }}>!</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
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
        {mainTab === "ad_confirm" && (
          <AdConfirmTab
            property={property}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}
