"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ACTIVITY_TYPES, SALES_ACTIONS, CONTRACT_ACTIONS, type ActivityType } from "@/lib/activity-types";

const STATUS_LABELS: Record<string, string> = {
  NEW: "新規", CONTACTING: "連絡中", VISITING: "内見調整中",
  NEGOTIATING: "商談中", CONTRACT: "契約済", CLOSED: "成約",
  LOST: "失注", PENDING: "保留",
};
const STATUS_BADGE: Record<string, React.CSSProperties> = {
  NEW:         { background: "#e3f2fd", color: "#1565c0" },
  CONTACTING:  { background: "#fff8e1", color: "#e65100" },
  VISITING:    { background: "#e8f5e9", color: "#2e7d32" },
  NEGOTIATING: { background: "#234f35", color: "#fff" },
  CONTRACT:    { background: "#1a237e", color: "#fff" },
  CLOSED:      { background: "#880e4f", color: "#fff" },
  LOST:        { background: "#fdeaea", color: "#8c1f1f" },
  PENDING:     { background: "#f3f2ef", color: "#706e68" },
};
const SOURCE_LABELS: Record<string, string> = {
  SUUMO: "SUUMO", ATHOME: "athome", YAHOO: "Yahoo不動産",
  HOMES: "HOME'S", HP: "自社HP", HP_MEMBER: "HP会員登録", TEL: "電話", WALK_IN: "来店",
  REFERRAL: "紹介", OTHER: "その他",
};
const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション", LAND: "土地",
};
const ACTIVITY_ICONS: Record<string, string> = {
  CALL: "📞", EMAIL: "✉", LINE: "💬", VISIT: "🏠",
  MEETING: "🤝", VIEWING: "👁", NOTE: "📝", AI_AUTO: "🤖",
};
const INQUIRY_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: "未対応", bg: "#ffebee", color: "#c62828" },
  CONTACTED: { label: "連絡済", bg: "#fff8e1", color: "#e65100" },
  VISITING: { label: "内見調整", bg: "#e3f2fd", color: "#1565c0" },
  NEGOTIATING: { label: "商談中", bg: "#e8f5e9", color: "#2e7d32" },
  CLOSED: { label: "完了", bg: "#f5f5f5", color: "#616161" },
  LOST: { label: "失注", bg: "#fdeaea", color: "#8c1f1f" },
};

interface FamilyMember {
  id: string; customer_id?: string; relation: string; name: string | null;
  name_kana: string | null; age: number | null; birth_year: number | null;
  occupation: string | null; annual_income: number | null; note: string | null;
  created_at?: string;
}
interface ActivityItem {
  id: string; type: string; direction: string; content: string;
  result: string | null; next_action: string | null; next_action_at: string | null;
  staff_id: string | null; created_at: string;
}
interface InquiryItem {
  id: string; source: string; received_at: string; ai_score: number | null;
  ai_notes: string | null; property_name: string | null; property_number: string | null;
  message: string | null; status: string; priority: string;
  visit_hope: boolean; document_hope: boolean;
  assigned_staff: { name: string } | null;
}
interface Customer {
  id: string; name: string; name_kana: string | null;
  email: string | null; tel: string | null; tel_mobile: string | null; line_id: string | null;
  postal_code: string | null; prefecture: string | null; city: string | null; address: string | null;
  current_housing_type: string | null; current_rent: number | null; current_housing_note: string | null;
  desired_property_type: string[]; desired_areas: string[]; desired_stations: string[];
  desired_budget_min: number | null; desired_budget_max: number | null;
  desired_area_min: number | null; desired_area_max: number | null;
  desired_rooms: string[]; desired_floor_min: number | null; desired_building_year: number | null;
  desired_walk_max: number | null; desired_move_timing: string | null;
  desired_features: string[]; desired_note: string | null;
  finance_type: string | null; down_payment: number | null; annual_income: number | null;
  loan_preapproval: string | null; loan_amount: number | null; loan_bank: string | null;
  has_property_to_sell: boolean; sell_property_note: string | null;
  source: string | null; source_detail: string | null;
  first_inquiry_at: string | null; first_inquiry_property: string | null;
  status: string; priority: string;
  ai_score: number | null; ai_analysis: string | null;
  ai_next_action: string | null; ai_analyzed_at: string | null;
  assigned_to: string | null; assigned_at: string | null; store_id: string | null;
  last_contact_at: string | null; next_contact_at: string | null; next_contact_note: string | null;
  contact_frequency: string | null; do_not_contact: boolean; unsubscribed: boolean;
  internal_memo: string | null; tags: string[];
  is_member: boolean; member_registered_at: string | null;
  member_id: string | null;
  member: {
    id: string; email: string; name: string; phone: string | null;
    is_active: boolean; created_at: string; last_login_at: string | null;
    profile: {
      property_types: string[]; desired_areas: string[]; desired_lines: string[];
      budget_max: number | null; desired_area_m2_min: number | null;
      desired_layout: string[]; purchase_timing: string | null;
      current_residence: string | null; current_rent: number | null;
      lease_expiry: string | null; has_property_to_sell: string | null;
      family_structure: string | null; children_ages: string | null;
      down_payment: number | null; annual_income_range: string | null;
      loan_preapproval: string | null; purchase_motivation: string | null;
      priority_points: string[]; other_agents: string | null; remarks: string | null;
    } | null;
  } | null;
  created_at: string;
  family_members: FamilyMember[];
  activities: ActivityItem[];
  inquiries: InquiryItem[];
  assigned_staff: { id: string; name: string } | null;
}

type TabKey = "basic" | "family" | "desired" | "finance" | "followup" | "history" | "matching" | "proposals";

interface ProposalItem {
  id: string;
  title: string | null;
  pdf_url: string | null;
  extracted_text: string | null;
  note: string | null;
  created_at: string;
  staff: { id: string; name: string } | null;
  property: { id: string; building_name: string | null; city: string | null; price: number | null } | null;
}

interface VisitItem {
  id: string;
  scheduled_at: string;
  status: string;
  result: string | null;
  feedback: string | null;
  property: { id: string; building_name: string | null; city: string | null; town?: string | null } | null;
  staff:    { id: string; name: string } | null;
}
interface MatchProperty {
  id: string;
  property_type: string;
  price: number | null;
  city: string | null;
  town: string | null;
  rooms: string | null;
  station_name1: string | null;
  station_walk1: number | null;
  building_name: string | null;
  images: { url: string }[];
  score: number;
}
interface AiNextAction {
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  action: string;
  timing: string;
  reason: string;
}
interface AiSuggestion {
  summary?: string;
  next_actions?: AiNextAction[];
  contact_message?: string;
  risk_level?: "HIGH" | "MEDIUM" | "LOW" | string;
  risk_reason?: string;
}

const inputSt: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 6,
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 14,
};
const label11: React.CSSProperties = { fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 };
const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", marginBottom: 12 };
const labelW: React.CSSProperties = { fontSize: 11, color: "#706e68", width: 90, flexShrink: 0 };

const PROP_TYPES = ["NEW_HOUSE", "USED_HOUSE", "MANSION", "LAND"];
const FEATURES = ["駐車場", "角部屋", "南向き", "ペット可", "庭付き", "オートロック", "床暖房", "学区"];

function TagList({ items, onRemove, onAdd, placeholder }: {
  items: string[]; onRemove: (i: number) => void;
  onAdd: (v: string) => void; placeholder?: string;
}) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} style={{ background: "#e8f5e9", color: "#234f35", borderRadius: 12, padding: "2px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
          {item}
          <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
        </span>
      ))}
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
        placeholder={placeholder ?? "入力してEnter"}
        style={{ padding: "2px 8px", border: "1px solid #e0deda", borderRadius: 12, fontSize: 11, fontFamily: "inherit", width: 120 }} />
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [form, setForm] = useState<Partial<Customer>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [allStaff, setAllStaff] = useState<{ id: string; name: string }[]>([]);
  const [stores, setStores]     = useState<{ id: string; name: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Private selection URL
  const [tokenInfo, setTokenInfo] = useState<{ exists: boolean; expiresAt?: string } | null>(null);
  const [tokenSending, setTokenSending] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Follow-up message
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [followUpMsg, setFollowUpMsg] = useState<{ subject: string; body: string; reason: string } | null>(null);
  const [followUpEditing, setFollowUpEditing] = useState(false);
  const [followUpSending, setFollowUpSending] = useState(false);
  const [followUpSent, setFollowUpSent] = useState(false);

  // Family
  const [editingMember, setEditingMember] = useState<Partial<FamilyMember> | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  // Activity form
  const [actType, setActType] = useState("CALL");
  const [actDir, setActDir] = useState("OUTBOUND");
  const [actContent, setActContent] = useState("");
  const [actResult, setActResult] = useState("");
  const [actNext, setActNext] = useState("");
  const [addingAct, setAddingAct] = useState(false);

  // Quick action bar
  const [quickAction, setQuickAction]       = useState<{ type: ActivityType; phase: string } | null>(null);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickForm, setQuickForm]           = useState({
    content: "", result: "", next_action: "", next_action_at: "",
  });
  const [savingQuick, setSavingQuick]       = useState(false);

  // Proposals
  const [proposals, setProposals]           = useState<ProposalItem[]>([]);
  const [uploadingProposal, setUploadingProposal] = useState(false);

  const loadProposals = useCallback(async () => {
    try {
      const r = await fetch(`/api/customers/${params.id}/proposals`);
      const d = await r.json() as { proposals?: ProposalItem[] };
      setProposals(d.proposals ?? []);
    } catch { /* ignore */ }
  }, [params.id]);

  // Matching / AI / Visits
  const [visits, setVisits]                 = useState<VisitItem[]>([]);
  const [matchProps, setMatchProps]         = useState<MatchProperty[]>([]);
  const [matchLoading, setMatchLoading]     = useState(false);
  const [aiSuggestion, setAiSuggestion]     = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading]           = useState(false);
  const [showVisitForm, setShowVisitForm]   = useState(false);
  const [visitForm, setVisitForm]           = useState<{
    scheduled_at: string;
    property_id:  string;
    staff_id:     string;
    feedback:     string;
  }>({ scheduled_at: "", property_id: "", staff_id: "", feedback: "" });
  const [savingVisit, setSavingVisit]       = useState(false);

  const loadCustomer = useCallback(async () => {
    try {
      const r = await fetch(`/api/customers/${params.id}?includeRelations=true`);
      const d = await r.json();
      if (!r.ok || !d.customer) {
        setError(d.error ?? "顧客情報の取得に失敗しました");
        return;
      }
      setCustomer(d.customer as Customer);
      setForm(d.customer as Customer);
    } catch {
      setError("顧客情報の取得に失敗しました");
    }
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      // 顧客データ取得（必須）
      await loadCustomer();

      // スタッフ一覧・tokenInfo は独立して取得（失敗しても顧客表示に影響しない）
      fetch("/api/staff?active=true&sales_only=true")
        .then(r => r.json())
        .then((d: { staff?: { id: string; name: string }[] }) => setAllStaff(d.staff ?? []))
        .catch(() => {});

      // 店舗一覧
      fetch("/api/stores")
        .then(r => r.json())
        .then((d: { stores?: { id: string; name: string }[] }) => setStores(d.stores ?? []))
        .catch(() => {});

      try {
        const tokenRes = await fetch(`/api/customers/${params.id}/send-private-selection-url`);
        if (tokenRes.ok) {
          const d = await tokenRes.json() as { exists?: boolean; expiresAt?: string };
          setTokenInfo(d.exists ? { exists: true, expiresAt: d.expiresAt } : { exists: false });
        } else {
          setTokenInfo({ exists: false });
        }
      } catch {
        setTokenInfo({ exists: false });
      }

      setLoading(false);
    };
    run();
  }, [loadCustomer, params.id]);

  const setF = <K extends keyof Customer>(k: K, v: Customer[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSendPrivateUrl = async () => {
    if (!customer) return;
    const label = tokenInfo?.exists ? "再送付" : "送付";
    if (!confirm(`${customer.name}様に非公開物件URLを${label}します。よろしいですか？`)) return;
    setTokenSending(true);
    setTokenError(null);
    try {
      const res = await fetch(`/api/customers/${params.id}/send-private-selection-url`, {
        method: "POST",
      });
      const data = await res.json() as { success?: boolean; expiresAt?: string; error?: string };
      if (!res.ok) {
        setTokenError(data.error ?? "送付に失敗しました");
        return;
      }
      setTokenInfo({ exists: true, expiresAt: data.expiresAt ?? "" });
    } catch {
      setTokenError("通信エラーが発生しました");
    } finally {
      setTokenSending(false);
    }
  };

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
      setCustomer(prev => prev ? { ...prev, ...data.customer } : data.customer);
      setMsg("保存しました"); setTimeout(() => setMsg(""), 3000);
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const loadVisits = useCallback(async () => {
    try {
      const r = await fetch(`/api/visit-appointments?customer_id=${params.id}`);
      const d = await r.json() as { visits?: VisitItem[] };
      setVisits(d.visits ?? []);
    } catch { /* ignore */ }
  }, [params.id]);

  const runAiSuggest = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/customers/${params.id}/ai-suggest`, { method: "POST" });
      const data = await res.json() as { suggestion?: AiSuggestion };
      setAiSuggestion(data.suggestion ?? null);
    } finally {
      setAiLoading(false);
    }
  };

  const runMatching = async () => {
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/customers/${params.id}/matching`);
      const data = await res.json() as { properties?: MatchProperty[] };
      setMatchProps(data.properties ?? []);
    } finally {
      setMatchLoading(false);
    }
  };

  const submitVisit = async () => {
    if (!visitForm.scheduled_at) { alert("内見日時を入力してください"); return; }
    setSavingVisit(true);
    try {
      const res = await fetch("/api/visit-appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          customer_id:  params.id,
          property_id:  visitForm.property_id || null,
          staff_id:     visitForm.staff_id    || null,
          scheduled_at: visitForm.scheduled_at,
          feedback:     visitForm.feedback    || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "登録に失敗しました");
        return;
      }
      setShowVisitForm(false);
      setVisitForm({ scheduled_at: "", property_id: "", staff_id: "", feedback: "" });
      await loadVisits();
      await loadCustomer();
    } finally {
      setSavingVisit(false);
    }
  };

  // matchingタブを開いたら内見一覧を取得
  useEffect(() => {
    if (activeTab === "matching") void loadVisits();
  }, [activeTab, loadVisits]);

  // proposalsタブを開いたら提案一覧を取得
  useEffect(() => {
    if (activeTab === "proposals") void loadProposals();
  }, [activeTab, loadProposals]);

  const submitQuickAction = async () => {
    if (!quickAction) return;
    if (!quickForm.next_action || !quickForm.next_action_at) {
      alert("次回アクションと日時は必須です");
      return;
    }
    setSavingQuick(true);
    try {
      const def = ACTIVITY_TYPES[quickAction.type];
      const res = await fetch(`/api/customers/${params.id}/activities`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:           quickAction.type,
          phase:          quickAction.phase,
          content:        quickForm.content || def.label,
          result:         quickForm.result || null,
          next_action:    quickForm.next_action,
          next_action_at: quickForm.next_action_at,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "記録に失敗しました");
        return;
      }
      setShowQuickModal(false);
      setQuickAction(null);
      setQuickForm({ content: "", result: "", next_action: "", next_action_at: "" });
      await loadCustomer();
    } finally {
      setSavingQuick(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true); setError("");
    try {
      const res = await fetch(`/api/customers/${params.id}/analyze`, { method: "POST" });
      const d = await res.json() as { score?: number; priority?: string; analysis?: string; next_action?: string; error?: string };
      if (d.error) { setError(d.error); return; }
      setForm(f => ({ ...f, ai_score: d.score, priority: d.priority as Customer["priority"], ai_analysis: d.analysis ?? null, ai_next_action: d.next_action ?? null, ai_analyzed_at: new Date().toISOString() }));
      setCustomer(prev => prev ? { ...prev, ai_score: d.score ?? null, ai_analysis: d.analysis ?? null, ai_next_action: d.next_action ?? null } : prev);
      setMsg("AI分析完了"); setTimeout(() => setMsg(""), 4000);
    } catch { setError("AI分析エラー"); }
    finally { setAnalyzing(false); }
  };

  const handleGenerateFollowUp = async () => {
    setGeneratingFollowUp(true); setError(""); setFollowUpMsg(null); setFollowUpSent(false);
    try {
      const res = await fetch(`/api/customers/${params.id}/follow-up-message`);
      const d = await res.json() as { subject?: string; body?: string; reason?: string; action?: string; error?: string };
      if (d.error) { setError(d.error); return; }
      if (d.action === "SKIP") { setError(`スキップ: ${d.reason ?? "条件に合う物件がありません"}`); return; }
      setFollowUpMsg({ subject: d.subject ?? "", body: d.body ?? "", reason: d.reason ?? "" });
    } catch { setError("メッセージ生成に失敗しました"); }
    finally { setGeneratingFollowUp(false); }
  };

  const handleSendFollowUp = async () => {
    if (!followUpMsg) return;
    setFollowUpSending(true); setError("");
    try {
      const res = await fetch(`/api/customers/${params.id}/follow-up-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(followUpMsg),
      });
      if (!res.ok) throw new Error("送信失敗");
      setFollowUpSent(true);
      setFollowUpMsg(null);
      setFollowUpEditing(false);
      setMsg("追客メールを記録しました。ステータスを「連絡中」に更新しました。");
      setTimeout(() => setMsg(""), 5000);
      await loadCustomer();
    } catch { setError("送信の記録に失敗しました"); }
    finally { setFollowUpSending(false); }
  };

  const handleAddMember = async () => {
    if (!editingMember?.relation) return;
    setSavingMember(true);
    try {
      const method = editingMember.id ? "PATCH" : "POST";
      const url = editingMember.id
        ? `/api/customers/${params.id}/family/${editingMember.id}`
        : `/api/customers/${params.id}/family`;
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMember),
      });
      if (!res.ok) { setError("家族の保存に失敗しました"); return; }
      setEditingMember(null);
      await loadCustomer();
    } catch { setError("通信エラー"); }
    finally { setSavingMember(false); }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("この家族情報を削除しますか？")) return;
    await fetch(`/api/customers/${params.id}/family/${memberId}`, { method: "DELETE" });
    await loadCustomer();
  };

  const handleAddActivity = async () => {
    if (!actContent) return;
    setAddingAct(true);
    try {
      await fetch(`/api/customers/${params.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actType, direction: actDir, content: actContent, result: actResult || null, next_action: actNext || null }),
      });
      setActContent(""); setActResult(""); setActNext("");
      await loadCustomer();
    } catch { setError("対応記録の保存に失敗しました"); }
    finally { setAddingAct(false); }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    const message = customer.source === "HP_MEMBER"
      ? `「${customer.name}」を削除しますか？\nHP会員アカウントも同時に削除されます。\nこの操作は取り消せません。`
      : `「${customer.name}」を削除しますか？\nこの操作は取り消せません。`;
    if (!confirm(message)) return;

    const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    if (res.ok) {
      alert("削除しました");
      router.push("/admin/customers");
    } else {
      const data = await res.json() as { error?: string };
      alert(data.error ?? "削除に失敗しました");
    }
  };

  const canDelete = ["ADMIN", "MANAGER", "OWNER"].includes(
    (session?.user as { permission?: string })?.permission ?? ""
  );

  if (loading) return <div style={{ padding: 28, color: "#706e68" }}>読み込み中...</div>;
  if (!customer) return <div style={{ padding: 28, color: "#8c1f1f" }}>顧客が見つかりません</div>;

  const badge = STATUS_BADGE[customer.status] ?? { background: "#f3f2ef", color: "#706e68" };
  const tabs: { key: TabKey; label: string }[] = [
    { key: "basic", label: "基本情報" },
    { key: "family", label: `家族構成 (${customer.family_members?.length ?? 0})` },
    { key: "desired", label: "希望条件" },
    { key: "finance", label: "資金計画" },
    { key: "followup", label: "追客管理" },
    { key: "history", label: `対応履歴 (${customer.activities?.length ?? 0})` },
    { key: "matching", label: "AI・内見・マッチング" },
    { key: "proposals", label: "提案物件" },
  ];

  const SaveBtn = () => (
    <button onClick={handleSave} disabled={saving}
      style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
      {saving ? "保存中..." : "変更を保存"}
    </button>
  );

  return (
    <div style={{ padding: 28, maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>← 顧客一覧</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>{customer.name} 様</h1>
          {customer.name_kana && <span style={{ fontSize: 12, color: "#706e68" }}>{customer.name_kana}</span>}
          <span style={{ ...badge, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
            {STATUS_LABELS[customer.status] ?? customer.status}
          </span>
          {customer.ai_score != null && (
            <span style={{ background: customer.ai_score >= 70 ? "#ffebee" : "#f7f6f2", color: customer.ai_score >= 70 ? "#c62828" : "#706e68", padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              AIスコア {customer.ai_score}点
            </span>
          )}
          {customer.do_not_contact && <span style={{ background: "#fdeaea", color: "#8c1f1f", padding: "3px 10px", borderRadius: 99, fontSize: 11 }}>連絡不要</span>}
          {canDelete && (
            <button
              type="button"
              onClick={handleDeleteCustomer}
              style={{
                marginLeft: "auto", padding: "6px 14px", borderRadius: 6,
                border: "1px solid #fca5a5", background: "#fff",
                color: "#ef4444", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🗑️ 顧客を削除
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          登録: {new Date(customer.created_at).toLocaleDateString("ja-JP")}
          {customer.source && `　反響元: ${SOURCE_LABELS[customer.source] ?? customer.source}`}
          {customer.first_inquiry_at && `　初回問い合わせ: ${new Date(customer.first_inquiry_at).toLocaleDateString("ja-JP")}`}
        </p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* HP会員情報セクション */}
      {customer.source === "HP_MEMBER" && customer.member && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: 8, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#1d4ed8", marginBottom: 8 }}>
            👤 HP会員情報
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
            <div>
              <span style={{ color: "#6b7280" }}>メール: </span>
              {customer.member.email}
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>登録日: </span>
              {new Date(customer.member.created_at).toLocaleDateString("ja-JP")}
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>最終ログイン: </span>
              {customer.member.last_login_at
                ? new Date(customer.member.last_login_at).toLocaleDateString("ja-JP")
                : "未ログイン"}
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>ステータス: </span>
              <span style={{
                color: customer.member.is_active ? "#166534" : "#991b1b",
                fontWeight: "bold",
              }}>
                {customer.member.is_active ? "有効" : "無効"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション記録バー */}
      <div style={{
        background: "#fff", borderRadius: 10, border: "1px solid #e0deda",
        padding: "10px 14px", marginBottom: 16,
        display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: "#706e68", marginRight: 4 }}>営業</span>
        {SALES_ACTIONS.map((type) => {
          const def = ACTIVITY_TYPES[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setQuickAction({ type, phase: "SALES" });
                setShowQuickModal(true);
              }}
              style={{
                padding: "6px 12px", borderRadius: 16, fontSize: 12,
                border: `1px solid ${def.color}55`,
                background: `${def.color}15`,
                color: def.color, cursor: "pointer", fontWeight: "bold",
                fontFamily: "inherit",
              }}
            >
              {def.label}
            </button>
          );
        })}
        <span style={{ width: 1, height: 22, background: "#e0deda", margin: "0 6px" }} />
        <span style={{ fontSize: 11, color: "#706e68", marginRight: 4 }}>契約</span>
        {CONTRACT_ACTIONS.map((type) => {
          const def = ACTIVITY_TYPES[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setQuickAction({ type, phase: "CONTRACT" });
                setShowQuickModal(true);
              }}
              style={{
                padding: "6px 12px", borderRadius: 16, fontSize: 12,
                border: `1px solid ${def.color}55`,
                background: `${def.color}15`,
                color: def.color, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {def.label}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e0deda", marginBottom: 20, gap: 0, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "9px 16px", fontSize: 12, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? "#234f35" : "#706e68", background: "none", border: "none", borderBottom: activeTab === t.key ? "2px solid #234f35" : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab1: 基本情報 ─── */}
      {activeTab === "basic" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>基本情報</div>
            {[
              { label: "氏名", k: "name" as const }, { label: "フリガナ", k: "name_kana" as const },
              { label: "メール", k: "email" as const }, { label: "電話", k: "tel" as const },
              { label: "携帯", k: "tel_mobile" as const }, { label: "LINE ID", k: "line_id" as const },
            ].map(({ label, k }) => (
              <div key={k} style={row}>
                <span style={labelW}>{label}</span>
                <input value={String(form[k] ?? "")} onChange={e => setF(k, e.target.value as never)}
                  style={{ ...inputSt, flex: 1 }} />
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>現住所・住まい</div>
            {[
              { label: "郵便番号", k: "postal_code" as const, ph: "123-4567" },
              { label: "都道府県", k: "prefecture" as const, ph: "東京都" },
              { label: "市区町村", k: "city" as const, ph: "目黒区" },
              { label: "番地以降", k: "address" as const, ph: "平町1-2-3" },
            ].map(({ label, k, ph }) => (
              <div key={k} style={row}>
                <span style={labelW}>{label}</span>
                <input value={String(form[k] ?? "")} onChange={e => setF(k, e.target.value as never)}
                  placeholder={ph} style={{ ...inputSt, flex: 1 }} />
              </div>
            ))}
            <div style={row}>
              <span style={labelW}>現在の住まい</span>
              <select value={String(form.current_housing_type ?? "")} onChange={e => setF("current_housing_type", e.target.value)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">選択</option>
                {["賃貸", "持家", "社宅", "実家", "その他"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>現在の家賃</span>
              <input type="number" value={String(form.current_rent ?? "")} onChange={e => setF("current_rent", Number(e.target.value) as never)}
                placeholder="80000" style={{ ...inputSt, flex: 1 }} />
              <span style={{ fontSize: 11, color: "#706e68", flexShrink: 0 }}>円/月</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>対応状況</div>
            <div style={row}>
              <span style={labelW}>ステータス</span>
              <select value={String(form.status ?? "NEW")} onChange={e => setF("status", e.target.value as never)}
                style={{ ...inputSt, flex: 1 }}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>優先度</span>
              <select value={String(form.priority ?? "NORMAL")} onChange={e => setF("priority", e.target.value as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="HIGH">高（HIGH）</option>
                <option value="NORMAL">普通（NORMAL）</option>
                <option value="LOW">低（LOW）</option>
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>担当者</span>
              <select value={String(form.assigned_to ?? "")} onChange={e => setF("assigned_to", (e.target.value || null) as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">未設定</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>担当店舗</span>
              <select value={String(form.store_id ?? "")} onChange={e => setF("store_id", (e.target.value || null) as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">未設定</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>流入元</span>
              <select value={String(form.source ?? "")} onChange={e => setF("source", e.target.value as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">選択</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>流入詳細</span>
              <input value={String(form.source_detail ?? "")} onChange={e => setF("source_detail", e.target.value as never)}
                placeholder="紹介者名・媒体詳細など" style={{ ...inputSt, flex: 1 }} />
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>内部メモ・タグ</div>
            <div style={{ marginBottom: 10 }}>
              <label style={label11}>内部メモ（非公開）</label>
              <textarea value={String(form.internal_memo ?? "")} onChange={e => setF("internal_memo", e.target.value as never)}
                rows={4} style={{ ...inputSt, resize: "vertical" }} placeholder="スタッフ向け備考・注意事項など" />
            </div>
            <div>
              <label style={label11}>タグ</label>
              <TagList
                items={form.tags ?? []}
                onRemove={i => setF("tags", (form.tags ?? []).filter((_, idx) => idx !== i) as never)}
                onAdd={v => setF("tags", [...(form.tags ?? []), v] as never)}
                placeholder="VIP・要注意など"
              />
            </div>
          </div>

          {/* 非公開物件URLの送付 */}
          <div style={{ gridColumn: "1/-1", background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, marginBottom: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>プライベートセレクション</div>
            <p style={{ fontSize: 12, color: "#706e68", margin: "0 0 12px" }}>
              非公開物件を閲覧できる専用URLをお客様のメールアドレス宛に送付します。有効期限は30日間です。
            </p>
            <button
              onClick={handleSendPrivateUrl}
              disabled={tokenSending || !customer.email}
              style={{
                padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: tokenSending ? "#aaa" : !customer.email ? "#ccc" : "#5BAD52",
                color: "#fff", border: "none",
                cursor: tokenSending || !customer.email ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {tokenSending
                ? "処理中..."
                : tokenInfo?.exists
                ? "非公開物件URLを再送付する"
                : "非公開物件URLを送付する"}
            </button>
            {!customer.email && (
              <p style={{ marginTop: 8, fontSize: 12, color: "#888" }}>※ メールアドレスが未登録のため送付できません</p>
            )}
            {tokenInfo?.exists && tokenInfo.expiresAt && (
              <p style={{ marginTop: 6, fontSize: 12, color: "#5BAD52" }}>
                ✓ 送付済み（有効期限：{new Date(tokenInfo.expiresAt).toLocaleDateString("ja-JP")}まで）
              </p>
            )}
            {tokenError && (
              <p style={{ marginTop: 6, fontSize: 12, color: "#c62828" }}>⚠ {tokenError}</p>
            )}
          </div>

          {/* HP会員プロフィールセクション */}
          {customer.member?.profile && (
            <div style={{ gridColumn: "1/-1", ...card }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#e3f2fd", color: "#1565c0", fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 700 }}>HP会員</span>
                購入希望条件（会員登録時の入力情報）
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "物件種別", value: customer.member.profile.property_types?.join("・") },
                  { label: "希望エリア", value: customer.member.profile.desired_areas?.join("・") },
                  { label: "希望路線", value: customer.member.profile.desired_lines?.join("・") },
                  { label: "予算上限", value: customer.member.profile.budget_max ? `${customer.member.profile.budget_max.toLocaleString()}万円` : null },
                  { label: "希望面積（最小）", value: customer.member.profile.desired_area_m2_min ? `${customer.member.profile.desired_area_m2_min}㎡以上` : null },
                  { label: "希望間取り", value: customer.member.profile.desired_layout?.join("・") },
                  { label: "購入希望時期", value: customer.member.profile.purchase_timing },
                  { label: "現在の住居", value: customer.member.profile.current_residence },
                  { label: "現在の賃料", value: customer.member.profile.current_rent ? `${customer.member.profile.current_rent.toLocaleString()}円/月` : null },
                  { label: "賃貸満期", value: customer.member.profile.lease_expiry },
                  { label: "売却予定", value: customer.member.profile.has_property_to_sell },
                  { label: "家族構成", value: customer.member.profile.family_structure },
                  { label: "子供の年齢", value: customer.member.profile.children_ages },
                  { label: "頭金", value: customer.member.profile.down_payment ? `${customer.member.profile.down_payment.toLocaleString()}万円` : null },
                  { label: "年収帯", value: customer.member.profile.annual_income_range },
                  { label: "ローン審査", value: customer.member.profile.loan_preapproval },
                  { label: "購入動機", value: customer.member.profile.purchase_motivation },
                  { label: "重視ポイント", value: customer.member.profile.priority_points?.join("・") },
                  { label: "他社検討", value: customer.member.profile.other_agents },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} style={{ background: "#f7f9ff", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "#706e68", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1b18" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {customer.member.profile.remarks && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f2f1ed" }}>
                  <div style={{ fontSize: 10, color: "#706e68", marginBottom: 4 }}>備考・要望</div>
                  <p style={{ fontSize: 13, color: "#3a2a1a", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                    {customer.member.profile.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <SaveBtn />
          </div>
        </div>
      )}

      {/* ─── Tab2: 家族構成 ─── */}
      {activeTab === "family" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setEditingMember({ relation: "配偶者" })}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#234f35", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              + 家族を追加
            </button>
          </div>

          {editingMember && (
            <div style={{ ...card, borderLeft: "3px solid #234f35" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>{editingMember.id ? "家族情報を編集" : "家族を追加"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={label11}>続柄 *</label>
                  <select value={editingMember.relation ?? ""} onChange={e => setEditingMember(m => ({ ...m!, relation: e.target.value }))} style={inputSt}>
                    {["本人", "配偶者", "子供", "親", "その他"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label11}>氏名</label>
                  <input value={editingMember.name ?? ""} onChange={e => setEditingMember(m => ({ ...m!, name: e.target.value }))} style={inputSt} placeholder="田中 花子" />
                </div>
                <div>
                  <label style={label11}>フリガナ</label>
                  <input value={editingMember.name_kana ?? ""} onChange={e => setEditingMember(m => ({ ...m!, name_kana: e.target.value }))} style={inputSt} placeholder="タナカ ハナコ" />
                </div>
                <div>
                  <label style={label11}>年齢</label>
                  <input type="number" value={editingMember.age ?? ""} onChange={e => setEditingMember(m => ({ ...m!, age: Number(e.target.value) || null }))} style={inputSt} placeholder="35" />
                </div>
                <div>
                  <label style={label11}>職業</label>
                  <select value={editingMember.occupation ?? ""} onChange={e => setEditingMember(m => ({ ...m!, occupation: e.target.value || null }))} style={inputSt}>
                    <option value="">選択</option>
                    {["会社員", "自営業", "公務員", "専業主婦/夫", "学生", "無職", "その他"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label11}>年収（万円）</label>
                  <input type="number" value={editingMember.annual_income ?? ""} onChange={e => setEditingMember(m => ({ ...m!, annual_income: Number(e.target.value) || null }))} style={inputSt} placeholder="400" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label11}>メモ</label>
                <input value={editingMember.note ?? ""} onChange={e => setEditingMember(m => ({ ...m!, note: e.target.value }))} style={inputSt} placeholder="共同名義希望・学区重視など" />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setEditingMember(null)}
                  style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
                <button onClick={handleAddMember} disabled={savingMember || !editingMember.relation}
                  style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: savingMember ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {savingMember ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          )}

          {(!customer.family_members || customer.family_members.length === 0) ? (
            <div style={{ ...card, textAlign: "center", color: "#706e68", fontSize: 13, padding: 48 }}>
              家族情報が登録されていません。「+ 家族を追加」ボタンから追加してください。
            </div>
          ) : customer.family_members.map(member => (
            <div key={member.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ background: "#234f35", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{member.relation}</span>
                  {member.name && <span style={{ fontSize: 14, fontWeight: 500 }}>{member.name}</span>}
                  {member.name_kana && <span style={{ fontSize: 11, color: "#706e68" }}>{member.name_kana}</span>}
                  {member.age && <span style={{ fontSize: 12, color: "#706e68" }}>{member.age}歳</span>}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {member.occupation && <span style={{ fontSize: 12, color: "#706e68" }}>職業: {member.occupation}</span>}
                  {member.annual_income && <span style={{ fontSize: 12, color: "#706e68" }}>年収: {member.annual_income.toLocaleString()}万円</span>}
                </div>
                {member.note && <div style={{ fontSize: 12, color: "#3a2a1a", marginTop: 6, background: "#fffde7", padding: "4px 10px", borderRadius: 6 }}>{member.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                <button onClick={() => setEditingMember({ ...member })}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>編集</button>
                <button onClick={() => handleDeleteMember(member.id)}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "1px solid #fdeaea", background: "#fdeaea", color: "#8c1f1f", cursor: "pointer", fontFamily: "inherit" }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tab3: 希望条件 ─── */}
      {activeTab === "desired" && (
        <div>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>物件種別（複数選択可）</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {PROP_TYPES.map(t => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.desired_property_type ?? []).includes(t)}
                    onChange={e => {
                      const curr = form.desired_property_type ?? [];
                      setF("desired_property_type", (e.target.checked ? [...curr, t] : curr.filter(x => x !== t)) as never);
                    }} />
                  {TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>エリア・立地</div>
            <div style={{ marginBottom: 12 }}>
              <label style={label11}>希望エリア（区・市など）</label>
              <TagList
                items={form.desired_areas ?? []}
                onRemove={i => setF("desired_areas", (form.desired_areas ?? []).filter((_, idx) => idx !== i) as never)}
                onAdd={v => setF("desired_areas", [...(form.desired_areas ?? []), v] as never)}
                placeholder="目黒区、世田谷区など"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label11}>希望沿線・駅</label>
              <TagList
                items={form.desired_stations ?? []}
                onRemove={i => setF("desired_stations", (form.desired_stations ?? []).filter((_, idx) => idx !== i) as never)}
                onAdd={v => setF("desired_stations", [...(form.desired_stations ?? []), v] as never)}
                placeholder="東急東横線/都立大学など"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={label11}>駅徒歩（分以内）</label>
                <input type="number" value={String(form.desired_walk_max ?? "")} onChange={e => setF("desired_walk_max", Number(e.target.value) as never)} style={inputSt} placeholder="10" />
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>予算・規模</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={label11}>予算下限（万円）</label>
                <input type="number" value={String(form.desired_budget_min ?? "")} onChange={e => setF("desired_budget_min", Number(e.target.value) as never)} style={inputSt} placeholder="5000" />
              </div>
              <div>
                <label style={label11}>予算上限（万円）</label>
                <input type="number" value={String(form.desired_budget_max ?? "")} onChange={e => setF("desired_budget_max", Number(e.target.value) as never)} style={inputSt} placeholder="8000" />
              </div>
              <div>
                <label style={label11}>面積下限（㎡）</label>
                <input type="number" value={String(form.desired_area_min ?? "")} onChange={e => setF("desired_area_min", Number(e.target.value) as never)} style={inputSt} placeholder="80" />
              </div>
              <div>
                <label style={label11}>築年数以内</label>
                <input type="number" value={String(form.desired_building_year ?? "")} onChange={e => setF("desired_building_year", Number(e.target.value) as never)} style={inputSt} placeholder="20" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label11}>希望間取り（複数可）</label>
              <TagList
                items={form.desired_rooms ?? []}
                onRemove={i => setF("desired_rooms", (form.desired_rooms ?? []).filter((_, idx) => idx !== i) as never)}
                onAdd={v => setF("desired_rooms", [...(form.desired_rooms ?? []), v] as never)}
                placeholder="3LDK、4LDKなど"
              />
            </div>
            <div>
              <label style={label11}>入居希望時期</label>
              <input value={String(form.desired_move_timing ?? "")} onChange={e => setF("desired_move_timing", e.target.value as never)}
                style={{ ...inputSt, maxWidth: 300 }} placeholder="2026年夏頃" />
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>こだわり条件</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {FEATURES.map(f => (
                <label key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.desired_features ?? []).includes(f)}
                    onChange={e => {
                      const curr = form.desired_features ?? [];
                      setF("desired_features", (e.target.checked ? [...curr, f] : curr.filter(x => x !== f)) as never);
                    }} />
                  {f}
                </label>
              ))}
            </div>
            <div>
              <label style={label11}>希望条件備考</label>
              <textarea value={String(form.desired_note ?? "")} onChange={e => setF("desired_note", e.target.value as never)}
                rows={3} style={{ ...inputSt, resize: "vertical" }} placeholder="その他こだわり条件など" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}><SaveBtn /></div>
        </div>
      )}

      {/* ─── Tab4: 資金計画 ─── */}
      {activeTab === "finance" && (
        <div>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>資金タイプ</div>
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              {["現金", "ローン", "現金+ローン"].map(v => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="finance_type" value={v}
                    checked={form.finance_type === v}
                    onChange={() => setF("finance_type", v as never)} />
                  {v}
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "頭金（万円）", k: "down_payment" as const, ph: "2000" },
                { label: "世帯年収（万円）", k: "annual_income" as const, ph: "900" },
                { label: "借入希望額（万円）", k: "loan_amount" as const, ph: "6000" },
              ].map(({ label, k, ph }) => (
                <div key={k}>
                  <label style={label11}>{label}</label>
                  <input type="number" value={String(form[k] ?? "")} onChange={e => setF(k, Number(e.target.value) as never)}
                    style={inputSt} placeholder={ph} />
                </div>
              ))}
              <div>
                <label style={label11}>事前審査状況</label>
                <select value={String(form.loan_preapproval ?? "")} onChange={e => setF("loan_preapproval", e.target.value as never)} style={inputSt}>
                  <option value="">未選択</option>
                  {["未実施", "審査中", "承認済", "否決"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={label11}>希望金融機関</label>
                <input value={String(form.loan_bank ?? "")} onChange={e => setF("loan_bank", e.target.value as never)}
                  style={inputSt} placeholder="住信SBIネット銀行など" />
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>売却物件</div>
            <div style={{ ...row, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.has_property_to_sell ?? false}
                  onChange={e => setF("has_property_to_sell", e.target.checked as never)} />
                売却物件あり（購入と同時売却）
              </label>
            </div>
            {form.has_property_to_sell && (
              <div>
                <label style={label11}>売却物件の概要</label>
                <textarea value={String(form.sell_property_note ?? "")} onChange={e => setF("sell_property_note", e.target.value as never)}
                  rows={3} style={{ ...inputSt, resize: "vertical" }} placeholder="世田谷区 マンション 2LDK 築10年など" />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}><SaveBtn /></div>
        </div>
      )}

      {/* ─── Tab5: 追客管理 ─── */}
      {activeTab === "followup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>AIスコアリング</div>
            {customer.ai_score != null ? (
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, color: customer.ai_score >= 70 ? "#c62828" : "#234f35", marginBottom: 8 }}>
                  {customer.ai_score}<span style={{ fontSize: 16 }}>点</span>
                </div>
                {customer.ai_analysis && (
                  <div style={{ fontSize: 12, color: "#3a2a1a", background: "#fffde7", padding: "10px 14px", borderRadius: 8, marginBottom: 10, lineHeight: 1.7 }}>
                    {customer.ai_analysis}
                  </div>
                )}
                {customer.ai_next_action && (
                  <div style={{ fontSize: 12, color: "#1565c0", background: "#e3f2fd", padding: "10px 14px", borderRadius: 8, marginBottom: 10 }}>
                    <strong>推奨アクション:</strong> {customer.ai_next_action}
                  </div>
                )}
                {customer.ai_analyzed_at && (
                  <div style={{ fontSize: 11, color: "#888" }}>分析日時: {new Date(customer.ai_analyzed_at).toLocaleString("ja-JP")}</div>
                )}
              </div>
            ) : (
              <div style={{ color: "#706e68", fontSize: 13, marginBottom: 12 }}>AI分析未実施</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={handleAnalyze} disabled={analyzing}
                style={{ padding: "8px 16px", borderRadius: 8, background: analyzing ? "#888" : "#1565c0", color: "#fff", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {analyzing ? "分析中..." : "🤖 AI分析を実行"}
              </button>
              <button onClick={handleGenerateFollowUp} disabled={generatingFollowUp}
                style={{ padding: "8px 16px", borderRadius: 8, background: generatingFollowUp ? "#888" : "#e65100", color: "#fff", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {generatingFollowUp ? "生成中..." : "📧 追客メールを生成"}
              </button>
            </div>

            {/* Follow-up message panel */}
            {followUpMsg && (
              <div style={{ marginTop: 16, borderTop: "1px solid #f0ede8", paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#3a2a1a", marginBottom: 10 }}>生成されたメッセージを確認・編集してください</div>
                {followUpEditing ? (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>件名</label>
                      <input value={followUpMsg.subject}
                        onChange={e => setFollowUpMsg(m => m ? { ...m, subject: e.target.value } : m)}
                        style={{ ...inputSt }} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>本文</label>
                      <textarea value={followUpMsg.body} rows={10}
                        onChange={e => setFollowUpMsg(m => m ? { ...m, body: e.target.value } : m)}
                        style={{ ...inputSt, resize: "vertical" }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>件名: {followUpMsg.subject}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#fafaf8", padding: "12px 14px", borderRadius: 8, color: "#3a2a1a" }}>{followUpMsg.body}</div>
                  </>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setFollowUpMsg(null); setFollowUpEditing(false); }}
                    style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
                  <button onClick={() => setFollowUpEditing(v => !v)}
                    style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>✏️ {followUpEditing ? "プレビュー" : "編集"}</button>
                  <button onClick={handleSendFollowUp} disabled={followUpSending}
                    style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: followUpSending ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {followUpSending ? "記録中..." : "✅ この内容で送信記録"}
                  </button>
                </div>
              </div>
            )}
            {followUpSent && (
              <div style={{ marginTop: 12, background: "#e8f5e9", color: "#2e7d32", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
                ✅ 追客メールを対応履歴に記録しました
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>追客設定</div>
            <div style={row}>
              <span style={labelW}>担当者</span>
              <select value={String(form.assigned_to ?? "")} onChange={e => setF("assigned_to", (e.target.value || null) as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">未設定</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>担当店舗</span>
              <select value={String(form.store_id ?? "")} onChange={e => setF("store_id", (e.target.value || null) as never)}
                style={{ ...inputSt, flex: 1 }}>
                <option value="">未設定</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={labelW}>次回連絡予定</span>
              <input type="date" value={String(form.next_contact_at ? new Date(String(form.next_contact_at)).toISOString().split("T")[0] : "")}
                onChange={e => setF("next_contact_at", (e.target.value || null) as never)} style={{ ...inputSt, flex: 1 }} />
            </div>
            <div style={row}>
              <span style={labelW}>連絡内容メモ</span>
              <input value={String(form.next_contact_note ?? "")} onChange={e => setF("next_contact_note", e.target.value as never)}
                placeholder="内見日程の確認・物件紹介など" style={{ ...inputSt, flex: 1 }} />
            </div>
            <div style={row}>
              <span style={labelW}>連絡頻度</span>
              <select value={String(form.contact_frequency ?? "")} onChange={e => setF("contact_frequency", e.target.value as never)} style={{ ...inputSt, flex: 1 }}>
                <option value="">選択</option>
                {["毎日", "週1", "週2", "月1", "必要時のみ"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={form.do_not_contact ?? false}
                  onChange={e => setF("do_not_contact", e.target.checked as never)} />
                連絡不要フラグ（DNC）
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.unsubscribed ?? false}
                  onChange={e => setF("unsubscribed", e.target.checked as never)} />
                メール配信停止
              </label>
            </div>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <div style={card}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>対応を記録する</div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 100px 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={label11}>種別</label>
                  <select value={actType} onChange={e => setActType(e.target.value)} style={inputSt}>
                    {Object.entries(ACTIVITY_ICONS).map(([k, icon]) => (
                      <option key={k} value={k}>{icon} {k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label11}>方向</label>
                  <select value={actDir} onChange={e => setActDir(e.target.value)} style={inputSt}>
                    <option value="OUTBOUND">発信</option>
                    <option value="INBOUND">着信</option>
                  </select>
                </div>
                <div>
                  <label style={label11}>対応内容 *</label>
                  <input value={actContent} onChange={e => setActContent(e.target.value)}
                    placeholder="対応内容を入力..." style={inputSt} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={label11}>結果</label>
                  <select value={actResult} onChange={e => setActResult(e.target.value)} style={inputSt}>
                    <option value="">選択</option>
                    <option value="INTERESTED">興味あり</option>
                    <option value="NOT_INTERESTED">興味なし</option>
                    <option value="CALLBACK">折り返し待ち</option>
                    <option value="VISIT_SCHEDULED">内見予約済</option>
                  </select>
                </div>
                <div>
                  <label style={label11}>次のアクション</label>
                  <input value={actNext} onChange={e => setActNext(e.target.value)}
                    placeholder="来週内見の確認など" style={inputSt} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleAddActivity} disabled={addingAct || !actContent}
                  style={{ padding: "8px 20px", borderRadius: 8, background: addingAct || !actContent ? "#888" : "#234f35", color: "#fff", border: "none", fontSize: 13, cursor: addingAct || !actContent ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {addingAct ? "記録中..." : "記録する"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}><SaveBtn /></div>
        </div>
      )}

      {/* ─── Tab6: 対応履歴 ─── */}
      {activeTab === "history" && (
        <div>
          {/* Inquiries section */}
          {customer.inquiries?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#706e68", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>反響・問い合わせ</div>
              {customer.inquiries.map(inq => {
                const st = INQUIRY_STATUS[inq.status] ?? { label: inq.status, bg: "#f5f5f5", color: "#616161" };
                return (
                  <div key={inq.id} style={{ ...card, borderLeft: inq.priority === "HIGH" ? "3px solid #f44336" : "3px solid #e0deda", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{SOURCE_LABELS[inq.source] ?? inq.source}</span>
                        <span style={{ ...st, padding: "1px 8px", borderRadius: 10, fontSize: 11 }}>{st.label}</span>
                        {inq.visit_hope && <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "1px 8px", borderRadius: 8, fontSize: 11 }}>内見希望</span>}
                        <span style={{ fontSize: 11, color: "#888" }}>{new Date(inq.received_at).toLocaleString("ja-JP")}</span>
                      </div>
                      <a href={`/admin/inquiries/${inq.id}`} style={{ fontSize: 11, color: "#234f35", textDecoration: "none" }}>詳細 →</a>
                    </div>
                    {inq.property_name && <div style={{ fontSize: 12, color: "#3a2a1a", marginBottom: 4 }}>📍 {inq.property_name}</div>}
                    {inq.message && <div style={{ fontSize: 12, color: "#706e68", fontStyle: "italic" }}>「{inq.message.slice(0, 120)}{inq.message.length > 120 ? "…" : ""}」</div>}
                    {inq.ai_score != null && (
                      <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                        AIスコア: <strong style={{ color: inq.ai_score >= 70 ? "#c62828" : "#3a2a1a" }}>{inq.ai_score}</strong>
                        {inq.assigned_staff && <span style={{ marginLeft: 10 }}>担当: {inq.assigned_staff.name}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Activities timeline */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#706e68", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>対応履歴タイムライン</div>
          {(!customer.activities || customer.activities.length === 0) ? (
            <div style={{ ...card, textAlign: "center", color: "#706e68", fontSize: 13, padding: 40 }}>
              対応履歴がありません。「追客管理」タブから記録できます。
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {customer.activities.map((act, i) => (
                <div key={act.id} style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f7f6f2", border: "2px solid #e0deda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                      {ACTIVITY_ICONS[act.type] ?? "📝"}
                    </div>
                    {i < customer.activities.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: "#e0deda", marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ ...card, flex: 1, padding: "12px 16px", marginBottom: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{act.type}</span>
                      <span style={{ background: act.direction === "INBOUND" ? "#e3f2fd" : "#f3f2ef", color: act.direction === "INBOUND" ? "#1565c0" : "#706e68", padding: "1px 8px", borderRadius: 8, fontSize: 10 }}>
                        {act.direction === "INBOUND" ? "着信/来訪" : "発信/訪問"}
                      </span>
                      <span style={{ fontSize: 11, color: "#888" }}>{new Date(act.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: act.result || act.next_action ? 8 : 0 }}>
                      {act.content}
                    </div>
                    {act.result && (
                      <div style={{ fontSize: 11, color: "#2e7d32", marginBottom: 4 }}>
                        結果: {act.result === "INTERESTED" ? "興味あり" : act.result === "NOT_INTERESTED" ? "興味なし" : act.result === "CALLBACK" ? "折り返し待ち" : act.result === "VISIT_SCHEDULED" ? "内見予約済" : act.result}
                      </div>
                    )}
                    {act.next_action && (
                      <div style={{ fontSize: 11, color: "#1565c0" }}>→ {act.next_action}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab7: AI・内見・マッチング ─── */}
      {activeTab === "matching" && (
        <div>
          {/* AIアシスタントカード */}
          <div style={{
            padding: 20, background: "#faf5ff",
            border: "1px solid #e9d5ff", borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#7c3aed" }}>🤖 AIアシスタント</div>
              <button
                type="button"
                onClick={runAiSuggest}
                disabled={aiLoading}
                style={{
                  padding: "5px 14px", borderRadius: 6, fontSize: 12,
                  border: "none", background: aiLoading ? "#e5e7eb" : "#7c3aed",
                  color: aiLoading ? "#9ca3af" : "#fff",
                  cursor: aiLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {aiLoading ? "✨ 分析中..." : "✨ AI分析"}
              </button>
            </div>

            {aiSuggestion ? (
              <div>
                {aiSuggestion.summary && (
                  <p style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
                    {aiSuggestion.summary}
                  </p>
                )}
                {aiSuggestion.next_actions?.map((act, i) => (
                  <div key={i} style={{
                    padding: "8px 12px", marginBottom: 8,
                    background: "#fff", borderRadius: 6,
                    border: `1px solid ${act.priority === "HIGH" ? "#fca5a5" : act.priority === "MEDIUM" ? "#fde68a" : "#e5e7eb"}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: "bold", color: "#374151" }}>
                      {act.priority === "HIGH" ? "🔴" : act.priority === "MEDIUM" ? "🟡" : "🟢"} {act.action}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {act.timing} — {act.reason}
                    </div>
                  </div>
                ))}
                {aiSuggestion.contact_message && (
                  <div style={{
                    padding: "10px 12px", background: "#fff",
                    border: "1px solid #e9d5ff", borderRadius: 6, marginTop: 8,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: "#7c3aed", marginBottom: 4 }}>
                      📝 推奨メッセージ
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {aiSuggestion.contact_message}
                    </div>
                  </div>
                )}
                {aiSuggestion.risk_level && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                    リスク: <strong>{aiSuggestion.risk_level}</strong>
                    {aiSuggestion.risk_reason ? ` — ${aiSuggestion.risk_reason}` : ""}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                「AI分析」ボタンを押すと、活動履歴をもとに次のアクションを提案します。
              </div>
            )}
          </div>

          {/* マッチング物件 */}
          <div style={{
            padding: 20, background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>🏠 マッチング物件</div>
              <button
                type="button"
                onClick={runMatching}
                disabled={matchLoading}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12,
                  border: "1px solid #bfdbfe", background: "#eff6ff",
                  color: "#1d4ed8",
                  cursor: matchLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {matchLoading ? "検索中..." : "🔍 検索"}
              </button>
            </div>

            {matchProps.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                「検索」を押すと希望条件に合う物件を表示します。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matchProps.slice(0, 10).map(p => (
                  <Link key={p.id} href={`/admin/properties/${p.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", gap: 10, padding: "8px 10px",
                      background: "#f9fafb", borderRadius: 6, alignItems: "center",
                    }}>
                      {p.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 4 }} />
                      ) : (
                        <div style={{ width: 60, height: 45, background: "#e5e7eb", borderRadius: 4 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: "bold", color: "#374151" }}>
                          {p.building_name || `${p.city ?? ""}${p.town ?? ""}`}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {p.price?.toLocaleString() ?? "?"}万円 / {p.rooms ?? "?"} / {p.station_name1 ?? ""}
                          {p.station_walk1 ? `徒歩${p.station_walk1}分` : ""}
                        </div>
                      </div>
                      <div style={{
                        padding: "2px 8px", borderRadius: 8,
                        background: "#f0fdf4", color: "#166534", fontSize: 11, fontWeight: "bold",
                      }}>
                        {p.score}点
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 内見管理 */}
          <div style={{
            padding: 20, background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>📅 内見予約 ({visits.length})</div>
              <button
                type="button"
                onClick={() => setShowVisitForm(true)}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12,
                  border: "none", background: "#5BAD52", color: "#fff",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ＋ 内見登録
              </button>
            </div>

            {visits.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>内見予約はまだありません。</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visits.map(v => (
                  <div key={v.id} style={{
                    padding: "10px 12px", background: "#f9fafb",
                    borderRadius: 6, border: "1px solid #e5e7eb",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: "bold", color: "#374151" }}>
                        {new Date(v.scheduled_at).toLocaleString("ja-JP", {
                          year: "numeric", month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span style={{
                        padding: "1px 8px", borderRadius: 8,
                        background: v.status === "DONE" ? "#dcfce7" : v.status === "CANCELED" ? "#fee2e2" : "#dbeafe",
                        color:      v.status === "DONE" ? "#166534" : v.status === "CANCELED" ? "#991b1b" : "#1d4ed8",
                        fontSize: 11, fontWeight: "bold",
                      }}>{v.status}</span>
                    </div>
                    {v.property && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        🏠 {v.property.building_name || `${v.property.city ?? ""}${v.property.town ?? ""}`}
                      </div>
                    )}
                    {v.staff && (
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>担当: {v.staff.name}</div>
                    )}
                    {v.feedback && (
                      <div style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>📝 {v.feedback}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: 提案物件 ─── */}
      {activeTab === "proposals" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 6, cursor: uploadingProposal ? "wait" : "pointer",
              border: "2px dashed #d1d5db", background: "#f9fafb",
              fontSize: 13, color: "#374151", opacity: uploadingProposal ? 0.6 : 1,
            }}>
              📄 販売図面PDFを添付
              <input
                type="file"
                accept=".pdf"
                multiple
                disabled={uploadingProposal}
                style={{ display: "none" }}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  setUploadingProposal(true);
                  try {
                    for (const file of files) {
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("title", file.name.replace(/\.pdf$/i, ""));
                      await fetch(`/api/customers/${params.id}/proposals`, {
                        method: "POST",
                        body:   fd,
                      });
                    }
                    await loadProposals();
                    await loadCustomer();
                  } finally {
                    setUploadingProposal(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>
              {uploadingProposal ? "⏳ AI解析中..." : "複数ファイル選択可・AIが内容を自動解析します"}
            </span>
          </div>

          {proposals.length === 0 ? (
            <div style={{ fontSize: 13, color: "#9ca3af", padding: 24, textAlign: "center" }}>
              提案物件はまだありません
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proposals.map(p => (
                <div key={p.id} style={{
                  padding: "12px 16px", background: "#fff",
                  border: "1px solid #e5e7eb", borderRadius: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 13 }}>📄 {p.title ?? "提案書類"}</div>
                      {p.extracted_text && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>
                          {p.extracted_text}
                        </div>
                      )}
                      {p.property && (
                        <div style={{ fontSize: 11, color: "#5BAD52", marginTop: 4 }}>
                          🏠 {p.property.building_name || p.property.city || ""} {p.property.price?.toLocaleString() ?? ""}万円
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      <div>{new Date(p.created_at).toLocaleDateString("ja-JP")}</div>
                      <div>{p.staff?.name ?? ""}</div>
                      {p.pdf_url && (
                        <a href={p.pdf_url} target="_blank" rel="noreferrer"
                          style={{ color: "#3b82f6", textDecoration: "none" }}>
                          PDFを開く
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* クイックアクション記録モーダル */}
      {showQuickModal && quickAction && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 520, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16 }}>
              {ACTIVITY_TYPES[quickAction.type]?.label} を記録
            </h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                内容・メモ
              </label>
              <textarea
                value={quickForm.content}
                onChange={e => setQuickForm({ ...quickForm, content: e.target.value })}
                rows={3}
                placeholder="簡潔に記録してください..."
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                結果・反応
              </label>
              <input
                value={quickForm.result}
                onChange={e => setQuickForm({ ...quickForm, result: e.target.value })}
                placeholder="例: 前向き検討、再度連絡を希望 等"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{
              marginBottom: 16, padding: 12,
              background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
            }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#92400e", marginBottom: 8 }}>
                ⚠️ 次回アクション（必須）
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  value={quickForm.next_action}
                  onChange={e => setQuickForm({ ...quickForm, next_action: e.target.value })}
                  placeholder="次にやること"
                  style={{ padding: "8px 10px", border: "1px solid #fcd34d", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <input
                  type="datetime-local"
                  value={quickForm.next_action_at}
                  onChange={e => setQuickForm({ ...quickForm, next_action_at: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid #fcd34d", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setShowQuickModal(false); setQuickAction(null); }}
                disabled={savingQuick}
                style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submitQuickAction}
                disabled={savingQuick}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "none",
                  background: savingQuick ? "#888" : "#5BAD52", color: "#fff",
                  fontSize: 13, fontWeight: "bold",
                  cursor: savingQuick ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                {savingQuick ? "記録中..." : "記録する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内見登録モーダル */}
      {showVisitForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 480, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16 }}>🏠 内見予約を登録</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                内見日時 *
              </label>
              <input
                type="datetime-local"
                value={visitForm.scheduled_at}
                onChange={e => setVisitForm(f => ({ ...f, scheduled_at: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                物件ID（任意）
              </label>
              <input
                type="text"
                value={visitForm.property_id}
                onChange={e => setVisitForm(f => ({ ...f, property_id: e.target.value }))}
                placeholder="cmxxxx..."
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                担当者
              </label>
              <select
                value={visitForm.staff_id}
                onChange={e => setVisitForm(f => ({ ...f, staff_id: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              >
                <option value="">未指定</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                備考
              </label>
              <textarea
                value={visitForm.feedback}
                onChange={e => setVisitForm(f => ({ ...f, feedback: e.target.value }))}
                rows={3}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowVisitForm(false)}
                disabled={savingVisit}
                style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submitVisit}
                disabled={savingVisit}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: savingVisit ? "#888" : "#5BAD52", color: "#fff", fontSize: 13, fontWeight: "bold", cursor: savingVisit ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {savingVisit ? "登録中..." : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
