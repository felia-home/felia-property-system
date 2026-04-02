"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  lead: "見込み客", active: "商談中", contract: "契約済み", closed: "クローズ",
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  lead:     { background: "#f3f2ef", color: "#706e68" },
  active:   { background: "#e3f0ff", color: "#1a56a0" },
  contract: { background: "#234f35", color: "#fff" },
  closed:   { background: "#fdeaea", color: "#8c1f1f" },
};
const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};
const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOME'S", HP: "自社HP", TEL: "電話", WALK_IN: "来店", OTHER: "その他",
};
const INQUIRY_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: "未対応", bg: "#ffebee", color: "#c62828" },
  CONTACTED: { label: "連絡済", bg: "#fff8e1", color: "#e65100" },
  VISITING: { label: "内見調整", bg: "#e3f2fd", color: "#1565c0" },
  NEGOTIATING: { label: "商談中", bg: "#e8f5e9", color: "#2e7d32" },
  CLOSED: { label: "完了", bg: "#f5f5f5", color: "#616161" },
  LOST: { label: "失注", bg: "#fdeaea", color: "#8c1f1f" },
};
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "📞 電話", EMAIL: "✉ メール", VISIT: "🏠 内見",
  MEETING: "🤝 来店", NOTE: "📝 メモ",
};

interface Customer {
  id: string; name: string; name_kana: string | null;
  email: string | null; phone: string | null;
  budget_min: number | null; budget_max: number | null;
  area_preferences: unknown; property_type_pref: string | null;
  rooms_pref: string | null; area_m2_pref: number | null;
  status: string; notes: string | null; source: string | null;
  ai_score: number | null; priority: string;
  assigned_agent_id: string | null;
  first_contact_at: string | null;
  last_contacted_at: string | null; next_action_date: string | null; next_action_note: string | null;
  created_at: string;
  inquiries: InquiryItem[];
  activities: ActivityItem[];
}

interface InquiryItem {
  id: string; source: string; received_at: string;
  inquiry_type: string; message: string | null;
  visit_hope: boolean; document_hope: boolean;
  property_name: string | null; property_number: string | null;
  status: string; ai_score: number | null; ai_notes: string | null;
  priority: string;
  assigned_staff: { name: string } | null;
}

interface ActivityItem {
  id: string; type: string; content: string; created_at: string; staff_id: string | null;
}

interface MatchingProperty {
  id: string; property_type: string; status: string;
  city: string; address: string; station_name1: string | null; station_walk1: number | null;
  price: number; rooms: string | null; area_build_m2: number | null;
}

const inputSt: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 6,
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const section: React.CSSProperties = {
  background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 14,
};

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"basic" | "inquiries" | "activities" | "matching">("basic");
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [matchingProps, setMatchingProps] = useState<MatchingProperty[]>([]);
  const [allStaff, setAllStaff] = useState<{ id: string; name: string }[]>([]);

  // Activity form
  const [actType, setActType] = useState("CALL");
  const [actContent, setActContent] = useState("");
  const [addingAct, setAddingAct] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${params.id}?includeRelations=true`)
      .then(r => r.json())
      .then(d => {
        if (!d.customer) return;
        setCustomer(d.customer);
        setForm(d.customer as Record<string, unknown>);
      })
      .catch(() => setError("顧客情報の取得に失敗しました"))
      .finally(() => setLoading(false));

    fetch("/api/staff?active=true")
      .then(r => r.json())
      .then((d: { staff?: { id: string; name: string }[] }) => setAllStaff(d.staff ?? []))
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (activeTab !== "matching" || !customer) return;
    fetch("/api/properties?status=APPROVED")
      .then(r => r.json())
      .then(d => {
        const props: MatchingProperty[] = d.properties ?? [];
        setMatchingProps(props.filter(p => {
          if (customer.budget_max && p.price > customer.budget_max) return false;
          if (customer.budget_min && p.price < customer.budget_min * 0.9) return false;
          if (customer.property_type_pref && p.property_type !== customer.property_type_pref) return false;
          return true;
        }).slice(0, 10));
      })
      .catch(() => {});
  }, [activeTab, customer]);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "更新に失敗しました"); return; }
      setCustomer(data.customer);
      setForm(data.customer as Record<string, unknown>);
      setMsg("保存しました"); setTimeout(() => setMsg(""), 3000);
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const handleAddActivity = async () => {
    if (!actContent) return;
    setAddingAct(true);
    try {
      await fetch(`/api/customers/${params.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actType, content: actContent }),
      });
      setActContent("");
      // リロード
      const res = await fetch(`/api/customers/${params.id}?includeRelations=true`);
      const d = await res.json();
      if (d.customer) { setCustomer(d.customer); setForm(d.customer as Record<string, unknown>); }
    } catch { setError("対応記録の保存に失敗しました"); }
    finally { setAddingAct(false); }
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!customer) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>顧客が見つかりません</div>;

  const badge = STATUS_BADGE[customer.status] ?? { background: "#f3f2ef", color: "#706e68" };
  const tabs = [
    { key: "basic", label: "基本情報" },
    { key: "inquiries", label: `反響・問い合わせ (${customer.inquiries?.length ?? 0})` },
    { key: "activities", label: `対応履歴 (${customer.activities?.length ?? 0})` },
    { key: "matching", label: "物件マッチング" },
  ] as const;

  return (
    <div style={{ padding: 28, maxWidth: 920 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>← 顧客一覧</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>{customer.name}</h1>
          {customer.name_kana && <span style={{ fontSize: 12, color: "#706e68" }}>{customer.name_kana}</span>}
          <span style={{ ...badge, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
            {STATUS_LABELS[customer.status] ?? customer.status}
          </span>
          {customer.ai_score != null && (
            <span style={{ background: customer.ai_score >= 70 ? "#ffebee" : "#f7f6f2", color: customer.ai_score >= 70 ? "#c62828" : "#706e68", padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
              AIスコア {customer.ai_score}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          登録日: {new Date(customer.created_at).toLocaleDateString("ja-JP")}
          {customer.source && `　初回反響: ${SOURCE_LABELS[customer.source] ?? customer.source}`}
        </p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e0deda", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "9px 18px", fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? "#234f35" : "#706e68", background: "none", border: "none", borderBottom: activeTab === t.key ? "2px solid #234f35" : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: 基本情報 ─── */}
      {activeTab === "basic" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#3a2a1a" }}>基本情報</div>
              {[
                { label: "氏名", k: "name" },
                { label: "フリガナ", k: "name_kana" },
                { label: "メール", k: "email" },
                { label: "電話", k: "phone" },
              ].map(({ label, k }) => (
                <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>{label}</span>
                  <input value={String(form[k] ?? "")} onChange={e => setF(k, e.target.value)} style={{ ...inputSt, flex: 1 }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>ステータス</span>
                <select value={String(form.status ?? "lead")} onChange={e => setF("status", e.target.value)} style={{ ...inputSt, flex: 1 }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>優先度</span>
                <select value={String(form.priority ?? "NORMAL")} onChange={e => setF("priority", e.target.value)} style={{ ...inputSt, flex: 1 }}>
                  <option value="HIGH">🔴 高</option>
                  <option value="NORMAL">🟡 普通</option>
                  <option value="LOW">⚪ 低</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>担当者</span>
                <select value={String(form.assigned_agent_id ?? "")} onChange={e => setF("assigned_agent_id", e.target.value || null)} style={{ ...inputSt, flex: 1 }}>
                  <option value="">未設定</option>
                  {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#3a2a1a" }}>備考</div>
              <textarea value={String(form.notes ?? "")} onChange={e => setF("notes", e.target.value)} rows={4}
                style={{ ...inputSt, resize: "vertical" }} placeholder="メモ・特記事項など" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#3a2a1a" }}>希望条件</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>予算</span>
                <input type="number" value={String(form.budget_min ?? "")} onChange={e => setF("budget_min", Number(e.target.value))} placeholder="下限" style={{ ...inputSt, flex: 1 }} />
                <span style={{ fontSize: 12, color: "#706e68" }}>〜</span>
                <input type="number" value={String(form.budget_max ?? "")} onChange={e => setF("budget_max", Number(e.target.value))} placeholder="上限" style={{ ...inputSt, flex: 1 }} />
                <span style={{ fontSize: 11, color: "#706e68" }}>万円</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>物件種別</span>
                <select value={String(form.property_type_pref ?? "")} onChange={e => setF("property_type_pref", e.target.value)} style={{ ...inputSt, flex: 1 }}>
                  <option value="">指定なし</option>
                  <option value="USED_HOUSE">中古戸建</option>
                  <option value="NEW_HOUSE">新築戸建</option>
                  <option value="MANSION">マンション</option>
                  <option value="LAND">土地</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>希望間取り</span>
                <input value={String(form.rooms_pref ?? "")} onChange={e => setF("rooms_pref", e.target.value)} placeholder="3LDK以上" style={{ ...inputSt, flex: 1 }} />
              </div>
            </div>

            <div style={section}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#3a2a1a" }}>追客状況</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>最終連絡日</span>
                <span style={{ fontSize: 13 }}>{customer.last_contacted_at ? new Date(customer.last_contacted_at).toLocaleDateString("ja-JP") : "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>次回アクション</span>
                <input type="date" value={String(form.next_action_date ? new Date(String(form.next_action_date)).toISOString().split("T")[0] : "")}
                  onChange={e => setF("next_action_date", e.target.value)} style={{ ...inputSt, flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#706e68", width: 80, flexShrink: 0 }}>内容</span>
                <input value={String(form.next_action_note ?? "")} onChange={e => setF("next_action_note", e.target.value)} placeholder="電話フォロー・物件紹介など" style={{ ...inputSt, flex: 1 }} />
              </div>
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab: 反響・問い合わせ履歴 ─── */}
      {activeTab === "inquiries" && (
        <div>
          {(!customer.inquiries || customer.inquiries.length === 0) ? (
            <div style={{ ...section, textAlign: "center", color: "#706e68", fontSize: 13, padding: 40 }}>
              問い合わせ履歴がありません
            </div>
          ) : customer.inquiries.map(inq => {
            const st = INQUIRY_STATUS_LABELS[inq.status] ?? { label: inq.status, bg: "#f5f5f5", color: "#616161" };
            return (
              <div key={inq.id} style={{ ...section, borderLeft: inq.priority === "HIGH" ? "4px solid #f44336" : "4px solid #e0deda" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{SOURCE_LABELS[inq.source] ?? inq.source}</span>
                    <span style={{ ...st, padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>{st.label}</span>
                    {inq.visit_hope && <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "1px 8px", borderRadius: 8, fontSize: 11 }}>内見希望</span>}
                    {inq.document_hope && <span style={{ background: "#f3e5f5", color: "#6a1b9a", padding: "1px 8px", borderRadius: 8, fontSize: 11 }}>資料希望</span>}
                    <span style={{ fontSize: 12, color: "#888" }}>{new Date(inq.received_at).toLocaleString("ja-JP")}</span>
                  </div>
                  <a href={`/admin/inquiries/${inq.id}`} style={{ fontSize: 12, color: "#234f35", textDecoration: "none" }}>詳細 →</a>
                </div>
                {inq.property_name && <div style={{ fontSize: 13, color: "#3a2a1a", marginBottom: 6 }}>📍 {inq.property_name}{inq.property_number ? ` (${inq.property_number})` : ""}</div>}
                {inq.message && <div style={{ fontSize: 13, fontStyle: "italic", color: "#3a2a1a", marginBottom: 8 }}>「{inq.message.slice(0, 150)}{inq.message.length > 150 ? "…" : ""}」</div>}
                {inq.ai_score != null && (
                  <div style={{ fontSize: 12, color: "#888" }}>
                    AIスコア: <strong style={{ color: inq.ai_score >= 70 ? "#c62828" : "#3a2a1a" }}>{inq.ai_score}</strong>
                    {inq.assigned_staff && <span style={{ marginLeft: 12 }}>担当: {inq.assigned_staff.name}</span>}
                  </div>
                )}
                {inq.ai_notes && <div style={{ fontSize: 12, color: "#706e68", marginTop: 6, background: "#fffde7", padding: "8px 12px", borderRadius: 8 }}>{inq.ai_notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: 対応履歴 ─── */}
      {activeTab === "activities" && (
        <div>
          {/* Add activity form */}
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#3a2a1a" }}>対応を記録する</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <select value={actType} onChange={e => setActType(e.target.value)}
                style={{ ...inputSt, width: 130, flexShrink: 0 }}>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <textarea value={actContent} onChange={e => setActContent(e.target.value)}
                placeholder="対応内容を入力..." rows={2}
                style={{ ...inputSt, flex: 1, resize: "vertical" }} />
              <button onClick={handleAddActivity} disabled={addingAct || !actContent}
                style={{ padding: "9px 18px", borderRadius: 8, background: addingAct ? "#888" : "#234f35", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                記録
              </button>
            </div>
          </div>

          {/* Activity list */}
          {(!customer.activities || customer.activities.length === 0) ? (
            <div style={{ ...section, textAlign: "center", color: "#706e68", fontSize: 13, padding: 32 }}>対応履歴がありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customer.activities.map(act => (
                <div key={act.id} style={{ ...section, display: "flex", gap: 14, alignItems: "flex-start", padding: 16 }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{ACTIVITY_TYPE_LABELS[act.type]?.split(" ")[0] ?? "📝"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ACTIVITY_TYPE_LABELS[act.type]?.split(" ").slice(1).join(" ") ?? act.type}</span>
                      <span style={{ fontSize: 11, color: "#888" }}>{new Date(act.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{act.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: 物件マッチング ─── */}
      {activeTab === "matching" && (
        <div>
          <div style={{ fontSize: 13, color: "#706e68", marginBottom: 16 }}>
            希望条件（{customer.budget_min?.toLocaleString() ?? "?"}〜{customer.budget_max?.toLocaleString() ?? "?"}万円
            {customer.property_type_pref ? `・${TYPE_LABELS[customer.property_type_pref] ?? customer.property_type_pref}` : ""}）に合う掲載中物件
          </div>
          {matchingProps.length === 0 ? (
            <div style={{ ...section, textAlign: "center", color: "#706e68", fontSize: 13, padding: 40 }}>
              {customer.budget_min || customer.budget_max ? "条件に合う掲載中物件はありません" : "予算を設定するとマッチング物件が表示されます"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {matchingProps.map(p => (
                <div key={p.id} style={{ ...section, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.address}
                    </div>
                    <div style={{ fontSize: 12, color: "#706e68" }}>
                      {p.station_name1 ? `${p.station_name1} 徒歩${p.station_walk1}分` : ""}
                      {p.rooms ? `　${p.rooms}` : ""}
                      {p.area_build_m2 ? `　${p.area_build_m2}㎡` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#234f35" }}>{p.price.toLocaleString()}万円</span>
                    <a href={`/admin/properties/${p.id}`} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid #234f35", color: "#234f35", textDecoration: "none" }}>詳細</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
