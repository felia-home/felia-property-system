"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PermissionBadge from "@/components/admin/PermissionBadge";
import { PERMISSIONS, Permission } from "@/lib/permissions";
import ImageUploader from "@/components/admin/ImageUploader";
import MultiImageUploader from "@/components/admin/MultiImageUploader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffFull {
  id: string;
  company_id: string | null;
  store_id: string | null;
  store: { id: string; name: string; store_code: string } | null;
  permission: string;
  employee_number: string | null;
  name: string;
  name_kana: string | null;
  name_en: string | null;
  nickname: string | null;
  position: string | null;
  qualifications: string[];
  takken_number: string | null;
  takken_prefecture: string | null;
  takken_expires_at: string | null;
  email_work: string | null;
  tel_work: string | null;
  tel_mobile: string | null;
  extension: string | null;
  email_personal: string | null;
  tel_personal: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  blood_type: string | null;
  emergency_contact: string | null;
  emergency_tel: string | null;
  emergency_relation: string | null;
  employment_type: string | null;
  hire_date: string | null;
  trial_end_date: string | null;
  department: string | null;
  annual_salary: number | null;
  specialty_areas: string[];
  specialty_types: string[];
  monthly_target: number | null;
  career_history: string | null;
  photo_url: string | null;
  bio: string | null;
  catchphrase: string | null;
  qualification: string | null;
  favorite_word: string | null;
  hobby: string | null;
  memorable_client: string | null;
  sub_image_url_1: string | null;
  sub_image_url_2: string | null;
  daily_mindset: string | null;
  published_hp: boolean;
  hp_order: number;
  show_on_recruit: boolean;
  joined_at: string | null;
  motto: string | null;
  favorite: string | null;
  interview_q1: string | null;
  interview_q2: string | null;
  interview_q3: string | null;
  interview_q4: string | null;
  interview_q5: string | null;
  interview_q6: string | null;
  staff_code: string | null;
  is_active: boolean;
  retirement_date: string | null;
  retirement_reason: string | null;
  successor_id: string | null;
  _count?: { properties_as_agent: number };
}

interface PropertyRow {
  id: string;
  property_number: string | null;
  status: string;
  city: string;
  town: string | null;
  price: number;
  property_type: string;
  published_at: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUALIFICATION_OPTIONS = [
  "宅地建物取引士",
  "FP2級",
  "FP1級",
  "住宅ローンアドバイザー",
  "不動産コンサルティングマスター",
  "マンション管理士",
  "管理業務主任者",
  "賃貸不動産経営管理士",
];

const TOKYO_WARDS = [
  "千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区", "江東区",
  "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区", "杉並区", "豊島区",
  "北区", "荒川区", "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区",
];

const SPECIALTY_TYPE_OPTIONS = [
  "新築一戸建て", "中古一戸建て", "新築マンション", "中古マンション", "土地", "投資物件",
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き", AD_REQUEST: "広告確認依頼中", AD_OK: "確認済み",
  AD_NG: "確認NG", READY_TO_PUBLISH: "掲載準備完了", PUBLISHED: "掲載中",
  SOLD_ALERT: "成約アラート", SOLD: "成約", CLOSED: "クローズ",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = { border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const row: React.CSSProperties = { display: "flex", flexDirection: "column" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const section: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24, marginBottom: 16 };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffFull | null>(null);
  const [form, setForm] = useState<Partial<StaffFull>>({});
  const [activeTab, setActiveTab] = useState<"basic" | "skills" | "hp" | "personal" | "properties" | "retire">("basic");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  // Properties tab
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);

  // Retire tab
  const [allStaff, setAllStaff] = useState<{ id: string; name: string }[]>([]);
  const [retireDate, setRetireDate] = useState("");
  const [retireReason, setRetireReason] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const [retiring, setRetiring] = useState(false);

  // Additional images (drag & drop uploader)
  const [additionalImages, setAdditionalImages] = useState<string[]>([])

  // Auth (password + delete)
  const { data: session } = useSession();
  const isAdmin = session?.user?.permission === "ADMIN";
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/staff/${params.id}`)
      .then(r => r.json())
      .then((d: { staff?: StaffFull }) => {
        if (!d.staff) return;
        setStaff(d.staff);
        setForm(d.staff);
      })
      .catch(() => {});
    fetch("/api/stores").then(r => r.json()).then((d: { stores: { id: string; name: string }[] }) => setStores(d.stores ?? [])).catch(() => {});
    fetch("/api/staff?active=true").then(r => r.json()).then((d: { staff: { id: string; name: string }[] }) => setAllStaff((d.staff ?? []).filter(s => s.id !== params.id))).catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (activeTab === "properties" && !propertiesLoaded) {
      fetch(`/api/staff/${params.id}?includeProperties=true`)
        .then(r => r.json())
        .then((d: { staff?: StaffFull & { properties_as_agent?: PropertyRow[] } }) => {
          setProperties(d.staff?.properties_as_agent ?? []);
          setPropertiesLoaded(true);
        })
        .catch(() => {});
    }
  }, [activeTab, params.id, propertiesLoaded]);

  const handleSave = async (fields?: Partial<StaffFull>) => {
    setSaving(true);
    setError("");
    try {
      const payload = fields ?? form;
      const res = await fetch(`/api/staff/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json() as { staff: StaffFull };
        if (d.staff) { setStaff(d.staff); setForm(d.staff); }
        setMsg("保存しました");
        setTimeout(() => setMsg(""), 3000);
      } else {
        setError("保存に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async () => {
    if (!successorId && (staff?._count?.properties_as_agent ?? 0) > 0) {
      setError("担当物件がある場合は引継ぎ先を選択してください");
      return;
    }
    if (!confirm(`${staff?.name}の退職処理を実行します。よろしいですか？`)) return;
    setRetiring(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/${params.id}/retire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successor_id: successorId || undefined,
          retirement_reason: retireReason,
          retirement_date: retireDate || undefined,
        }),
      });
      if (res.ok) {
        const d = await res.json() as { transferred: number };
        alert(`退職処理完了。${d.transferred}件の物件が移管されました。`);
        router.push("/admin/staff");
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "退職処理に失敗しました");
        setRetiring(false);
      }
    } catch {
      setError("通信エラーが発生しました");
      setRetiring(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword) return;
    setPwMsg("");
    const res = await fetch(`/api/staff/${params.id}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const d = await res.json() as { success?: boolean; error?: string };
    setPwMsg(d.success ? "✅ パスワードを設定しました" : `❌ ${d.error}`);
    if (d.success) setNewPassword("");
    setTimeout(() => setPwMsg(""), 4000);
  };

  const handleUnlock = async () => {
    await fetch(`/api/staff/${params.id}/set-password`, { method: "DELETE" });
    setStaff(s => s ? { ...s, is_locked: false, failed_login_count: 0 } : s);
  };

  const handleDelete = async () => {
    if (!confirm(`${staff?.name} を削除（退職処理）します。この操作後、このスタッフはログインできなくなります。よろしいですか？`)) return;
    setDeleting(true);
    const res = await fetch(`/api/staff/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      alert("削除しました");
      router.push("/admin/staff");
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "削除に失敗しました");
      setDeleting(false);
    }
  };

  const setF = (key: keyof StaffFull, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleArrayItem = (key: "qualifications" | "specialty_areas" | "specialty_types", item: string) => {
    const arr = (form[key] as string[]) ?? [];
    setF(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  // Takken expiry warning
  const takkenDaysLeft = form.takken_expires_at
    ? Math.floor((new Date(form.takken_expires_at).getTime() - Date.now()) / 86400000)
    : null;

  if (!staff) return <div style={{ padding: 40, color: "#aaa" }}>読み込み中...</div>;

  const tabs = [
    { key: "basic", label: "基本情報" },
    { key: "skills", label: "資格・スキル" },
    { key: "hp", label: "HP公開プロフィール" },
    { key: "personal", label: "個人情報" },
    { key: "properties", label: `担当物件 (${staff._count?.properties_as_agent ?? 0})` },
    { key: "retire", label: "退職処理" },
  ] as const;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 6, fontFamily: "inherit" }}>← スタッフ一覧</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{staff.name}</h1>
            <PermissionBadge permission={staff.permission} />
            {!staff.is_active && (
              <span style={{ background: "#f2f1ed", color: "#888", fontSize: 11, padding: "3px 10px", borderRadius: 12 }}>退職済み</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{staff.store?.name ?? "店舗未設定"}</div>
        </div>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e0deda", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "9px 18px", fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? "#8c1f1f" : "#706e68", background: "none", border: "none", borderBottom: activeTab === t.key ? "2px solid #8c1f1f" : "2px solid transparent", marginBottom: -2, cursor: "pointer", fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: 基本情報 ─── */}
      {activeTab === "basic" && (
        <div>
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>氏名・識別情報</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>氏名 <span style={{ color: "#8c1f1f" }}>*</span></label>
                <input style={inp} value={form.name ?? ""} onChange={e => setF("name", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>氏名（カナ）</label>
                <input style={inp} value={form.name_kana ?? ""} onChange={e => setF("name_kana", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>社員番号</label>
                <input style={inp} value={form.employee_number ?? ""} onChange={e => setF("employee_number", e.target.value)} placeholder="EMP-001" />
              </div>
              <div style={row}>
                <label style={lbl}>英語表記名</label>
                <input style={inp} value={form.name_en ?? ""} onChange={e => setF("name_en", e.target.value)} placeholder="Taro Yamada" />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>権限・所属</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>権限 <span style={{ color: "#8c1f1f" }}>*</span></label>
                <select style={inp} value={form.permission ?? "AGENT"} onChange={e => setF("permission", e.target.value)}>
                  {(Object.keys(PERMISSIONS) as Permission[]).map(p => (
                    <option key={p} value={p}>{PERMISSIONS[p].label}</option>
                  ))}
                </select>
                {form.permission && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{PERMISSIONS[form.permission as Permission]?.description}</div>
                )}
              </div>
              <div style={row}>
                <label style={lbl}>所属店舗</label>
                <select style={inp} value={form.store_id ?? ""} onChange={e => setF("store_id", e.target.value || null)}>
                  <option value="">未設定</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={row}>
                <label style={lbl}>肩書き</label>
                <input style={inp} value={form.position ?? ""} onChange={e => setF("position", e.target.value)} placeholder="例: 店長・主任・宅建士" />
              </div>
              <div style={row}>
                <label style={lbl}>部署</label>
                <input style={inp} value={form.department ?? ""} onChange={e => setF("department", e.target.value)} placeholder="営業部" />
              </div>
              <div style={row}>
                <label style={lbl}>物件番号コード</label>
                <input style={{ ...inp, fontFamily: "monospace" }} value={form.staff_code ?? ""} onChange={e => setF("staff_code", e.target.value || null)} placeholder="例: kato" />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>物件番号に使用されます（例: kato-001）。変更すると既存の物件番号には影響しません。</div>
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>業務用連絡先</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>業務用メール</label>
                <input style={inp} type="email" value={form.email_work ?? ""} onChange={e => setF("email_work", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>内線番号</label>
                <input style={inp} value={form.extension ?? ""} onChange={e => setF("extension", e.target.value)} placeholder="101" />
              </div>
              <div style={row}>
                <label style={lbl}>業務用電話（固定）</label>
                <input style={inp} value={form.tel_work ?? ""} onChange={e => setF("tel_work", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>業務用携帯</label>
                <input style={inp} value={form.tel_mobile ?? ""} onChange={e => setF("tel_mobile", e.target.value)} />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>雇用情報</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>雇用形態</label>
                <select style={inp} value={form.employment_type ?? ""} onChange={e => setF("employment_type", e.target.value || null)}>
                  <option value="">未設定</option>
                  <option value="FULLTIME">正社員</option>
                  <option value="PARTTIME">パート・アルバイト</option>
                  <option value="CONTRACT">契約社員</option>
                  <option value="DISPATCH">派遣</option>
                </select>
              </div>
              <div style={row}>
                <label style={lbl}>ニックネーム（HP表示名）</label>
                <input style={inp} value={form.nickname ?? ""} onChange={e => setF("nickname", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>入社日</label>
                <input style={inp} type="date" value={form.hire_date ? form.hire_date.slice(0, 10) : ""} onChange={e => setF("hire_date", e.target.value || null)} />
              </div>
              <div style={row}>
                <label style={lbl}>試用期間終了日</label>
                <input style={inp} type="date" value={form.trial_end_date ? form.trial_end_date.slice(0, 10) : ""} onChange={e => setF("trial_end_date", e.target.value || null)} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => handleSave()} disabled={saving || !staff.is_active}
              style={{ padding: "10px 28px", borderRadius: 8, background: saving ? "#888" : "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>

          {/* パスワード設定（ADMIN のみ） */}
          {isAdmin && (
            <div style={{ ...section, marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#3a2a1a" }}>🔑 パスワード設定</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="新しいパスワード（8文字以上）"
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={handleSetPassword}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#1565c0", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  設定する
                </button>
              </div>
              {pwMsg && <div style={{ fontSize: 13, color: pwMsg.startsWith("✅") ? "#2e7d32" : "#c62828" }}>{pwMsg}</div>}
              {(staff as StaffFull & { is_locked?: boolean; failed_login_count?: number; last_login_at?: string | null; login_count?: number }).is_locked && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#c62828" }}>
                  ⚠️ このアカウントはロックされています
                  <button onClick={handleUnlock} style={{ marginLeft: 8, color: "#1565c0", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>ロックを解除する</button>
                </div>
              )}
              {(staff as StaffFull & { last_login_at?: string | null; login_count?: number }).last_login_at && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#706e68" }}>
                  最終ログイン: {new Date((staff as StaffFull & { last_login_at?: string | null }).last_login_at!).toLocaleString("ja-JP")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: 資格・スキル ─── */}
      {activeTab === "skills" && (
        <div>
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>宅建士証</div>
            {takkenDaysLeft !== null && takkenDaysLeft <= 90 && takkenDaysLeft >= 0 && (
              <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#664d03" }}>
                ⚠️ 宅建士証の有効期限まで <strong>{takkenDaysLeft}日</strong> です。更新手続きを確認してください。
              </div>
            )}
            {takkenDaysLeft !== null && takkenDaysLeft < 0 && (
              <div style={{ background: "#fdeaea", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#8c1f1f" }}>
                ❌ 宅建士証の有効期限が切れています。
              </div>
            )}
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>宅建士証番号</label>
                <input style={inp} value={form.takken_number ?? ""} onChange={e => setF("takken_number", e.target.value)} placeholder="第012345号" />
              </div>
              <div style={row}>
                <label style={lbl}>登録都道府県</label>
                <input style={inp} value={form.takken_prefecture ?? ""} onChange={e => setF("takken_prefecture", e.target.value)} placeholder="東京都" />
              </div>
              <div style={row}>
                <label style={lbl}>有効期限</label>
                <input style={inp} type="date" value={form.takken_expires_at ? form.takken_expires_at.slice(0, 10) : ""} onChange={e => setF("takken_expires_at", e.target.value || null)} />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>保有資格</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {QUALIFICATION_OPTIONS.map(q => (
                <label key={q} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.qualifications ?? []).includes(q)}
                    onChange={() => toggleArrayItem("qualifications", q)}
                  />
                  {q}
                </label>
              ))}
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>得意エリア（東京23区）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {TOKYO_WARDS.map(w => (
                <label key={w} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.specialty_areas ?? []).includes(w)}
                    onChange={() => toggleArrayItem("specialty_areas", w)}
                  />
                  {w}
                </label>
              ))}
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>得意物件種別</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {SPECIALTY_TYPE_OPTIONS.map(t => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox"
                    checked={(form.specialty_types ?? []).includes(t)}
                    onChange={() => toggleArrayItem("specialty_types", t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>目標・経歴</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>月間目標件数</label>
                <input style={inp} type="number" value={form.monthly_target ?? ""} onChange={e => setF("monthly_target", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
            <div style={{ ...row, marginTop: 14 }}>
              <label style={lbl}>職歴・経歴メモ（社内のみ）</label>
              <textarea
                value={form.career_history ?? ""}
                onChange={e => setF("career_history", e.target.value)}
                rows={5}
                style={{ ...inp, resize: "vertical" }}
                placeholder="前職・経験・特記事項など"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => handleSave()} disabled={saving}
              style={{ padding: "10px 28px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab: HP公開プロフィール ─── */}
      {activeTab === "hp" && (
        <div>
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>プロフィール写真</div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f7f6f2", overflow: "hidden", flexShrink: 0 }}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#ccc" }}>👤</div>
                )}
              </div>
              <div style={{ flex: 1, ...row }}>
                <label style={lbl}>プロフィール画像</label>
                <input
                  style={{ ...inp, marginBottom: 8 }}
                  value={form.photo_url ?? ""}
                  onChange={e => setF("photo_url", e.target.value || null)}
                  placeholder="https://... または下からアップロード"
                />
                <ImageUploader
                  folder="staff"
                  currentUrl={form.photo_url ?? ""}
                  label="ローカルから画像を選択"
                  onUpload={(url) => setF("photo_url", url)}
                />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>HP表示テキスト</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>HP表示名（ニックネーム）</label>
                <input style={inp} value={form.nickname ?? ""} onChange={e => setF("nickname", e.target.value)} placeholder="田中エージェント" />
              </div>
              <div style={row}>
                <label style={lbl}>キャッチフレーズ</label>
                <input style={inp} value={form.catchphrase ?? ""} onChange={e => setF("catchphrase", e.target.value)} placeholder="城南エリアのプロ" />
              </div>
            </div>
            <div style={{ ...row, marginTop: 14 }}>
              <label style={lbl}>
                自己紹介文（HP掲載）
                <span style={{ fontSize: 11, color: (form.bio?.length ?? 0) > 300 ? "#8c1f1f" : "#888", marginLeft: 8 }}>{form.bio?.length ?? 0}/300文字</span>
              </label>
              <textarea
                value={form.bio ?? ""}
                onChange={e => setF("bio", e.target.value)}
                rows={6}
                maxLength={350}
                style={{ ...inp, resize: "vertical", borderColor: (form.bio?.length ?? 0) > 300 ? "#d9534f" : "#e0deda" }}
                placeholder="お客様への一言メッセージ、得意なことなど..."
              />
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>掲載設定</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>HP公開設定</label>
                <select style={inp} value={form.published_hp ? "true" : "false"} onChange={e => setF("published_hp", e.target.value === "true")}>
                  <option value="true">公開</option>
                  <option value="false">非公開</option>
                </select>
              </div>
              <div style={row}>
                <label style={lbl}>表示順序</label>
                <input style={inp} type="number" value={form.hp_order ?? 0} onChange={e => setF("hp_order", Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* 採用ページ表示フラグ */}
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#3a2a1a" }}>採用ページ設定</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.show_on_recruit ?? false}
                onChange={e => setF("show_on_recruit", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#374151" }}>採用ページに表示する</span>
            </label>
          </div>

          {/* HP追加情報 */}
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>HP掲載追加情報</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={row}>
                <label style={lbl}>資格（テキスト）</label>
                <input style={inp} value={form.qualification ?? ""} onChange={e => setF("qualification", e.target.value || null)} placeholder="宅地建物取引士" />
              </div>
              <div style={row}>
                <label style={lbl}>好きな言葉</label>
                <input style={inp} value={form.favorite_word ?? ""} onChange={e => setF("favorite_word", e.target.value || null)} placeholder="例：努力・謙虚" />
              </div>
              <div style={row}>
                <label style={lbl}>趣味</label>
                <input style={inp} value={form.hobby ?? ""} onChange={e => setF("hobby", e.target.value || null)} placeholder="例：フットサル・読書" />
              </div>
              <div style={row}>
                <label style={lbl}>印象に残っているお客様・エピソード</label>
                <textarea value={form.memorable_client ?? ""} onChange={e => setF("memorable_client", e.target.value || null)} rows={4} style={{ ...inp, resize: "vertical" }} placeholder="印象に残っているお客様や仕事のエピソードを入力..." />
              </div>
              <div style={row}>
                <label style={lbl}>日々心掛けている事</label>
                <textarea
                  value={form.daily_mindset ?? ""}
                  onChange={e => setF("daily_mindset", e.target.value || null)}
                  rows={4}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="日々の仕事で心がけていることを入力..."
                />
              </div>
              <div style={row}>
                <label style={lbl}>サブ画像1</label>
                <ImageUploader folder="staff" currentUrl={form.sub_image_url_1 ?? undefined} label="サブ画像1をアップロード" onUpload={url => setF("sub_image_url_1", url)} />
                {form.sub_image_url_1 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.sub_image_url_1} alt="サブ画像1" style={{ marginTop: 8, height: 80, borderRadius: 4, objectFit: "cover" }} />
                )}
              </div>
              <div style={row}>
                <label style={lbl}>サブ画像2</label>
                <ImageUploader folder="staff" currentUrl={form.sub_image_url_2 ?? undefined} label="サブ画像2をアップロード" onUpload={url => setF("sub_image_url_2", url)} />
                {form.sub_image_url_2 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.sub_image_url_2} alt="サブ画像2" style={{ marginTop: 8, height: 80, borderRadius: 4, objectFit: "cover" }} />
                )}
              </div>
              <div style={row}>
                <label style={lbl}>追加画像（複数枚・ドラッグ＆ドロップ対応）</label>
                <p style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>アップロードしたURLをサブ画像1・サブ画像2にコピーしてご利用ください</p>
                <MultiImageUploader
                  folder="staff"
                  maxFiles={10}
                  onUpload={(urls) => {
                    setAdditionalImages(prev => [...prev, ...urls])
                    if (urls[0] && !form.sub_image_url_1) {
                      setForm(prev => ({ ...prev, sub_image_url_1: urls[0] }))
                    }
                    if (urls[1] && !form.sub_image_url_2) {
                      setForm(prev => ({ ...prev, sub_image_url_2: urls[1] }))
                    }
                  }}
                />
                {additionalImages.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 6 }}>アップロード済みURL（クリックでコピー）</p>
                    {additionalImages.map((url, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <input
                          readOnly
                          value={url}
                          style={{ flex: 1, padding: "4px 8px", fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb", cursor: "text" }}
                          onClick={(e) => {
                            (e.target as HTMLInputElement).select()
                            void navigator.clipboard.writeText(url)
                          }}
                        />
                        <button
                          onClick={() => void navigator.clipboard.writeText(url)}
                          style={{ padding: "4px 8px", fontSize: 11, background: "#5BAD52", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          コピー
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 採用ページ用情報 */}
          <div style={{ ...section, marginTop: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#374151", marginBottom: 16 }}>
              採用ページ用情報
              <span style={{ fontSize: 11, fontWeight: "normal", color: "#9ca3af", marginLeft: 8 }}>
                「採用ページに表示する」をONにした場合に使用されます
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={row}>
                <label style={lbl}>入社年月</label>
                <input
                  type="text"
                  placeholder="例: 2021年4月"
                  value={form.joined_at ?? ""}
                  onChange={e => setF("joined_at", e.target.value || null)}
                  style={{ ...inp, width: 200 }}
                />
              </div>
              <div style={row}>
                <label style={lbl}>仕事のモットー</label>
                <input
                  type="text"
                  placeholder="例: 誠実に、丁寧に"
                  value={form.motto ?? ""}
                  onChange={e => setF("motto", e.target.value || null)}
                  style={inp}
                />
              </div>
              <div style={row}>
                <label style={lbl}>好きな言葉（採用用）</label>
                <input
                  type="text"
                  placeholder="例: 一期一会"
                  value={form.favorite ?? ""}
                  onChange={e => setF("favorite", e.target.value || null)}
                  style={inp}
                />
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: "bold", color: "#374151", margin: "20px 0 12px" }}>
              インタビュー Q&A
              <span style={{ fontSize: 11, fontWeight: "normal", color: "#9ca3af", marginLeft: 8 }}>
                質問と回答を自由に入力してください
              </span>
            </div>

            {([1, 2, 3, 4, 5, 6] as const).map(n => (
              <div key={n} style={{ ...row, marginBottom: 14 }}>
                <label style={lbl}>Q{n}</label>
                <textarea
                  placeholder={
                    n === 1 ? "例: Q. この仕事を選んだ理由は？\nA. お客様の人生の大きな決断に関わる仕事に魅力を感じました。" :
                    n === 2 ? "例: Q. 仕事で大切にしていることは？\nA. お客様の立場に立って考えること。" :
                    `インタビュー Q${n} を入力`
                  }
                  value={(form as Record<string, unknown>)[`interview_q${n}`] as string ?? ""}
                  onChange={e => setF(`interview_q${n}` as keyof StaffFull, e.target.value || null)}
                  rows={3}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>プレビュー</div>
            <div style={{ border: "1px solid #e0deda", borderRadius: 10, padding: 16, maxWidth: 280, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f7f6f2", overflow: "hidden", flexShrink: 0 }}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc" }}>👤</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{form.nickname ?? form.name ?? "—"}</div>
                {form.catchphrase && <div style={{ fontSize: 12, color: "#706e68", marginTop: 2 }}>{form.catchphrase}</div>}
                {form.store_id && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{stores.find(s => s.id === form.store_id)?.name ?? "—"}</div>}
                {(form.qualifications ?? []).length > 0 && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{(form.qualifications ?? []).join("・")}</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => handleSave()} disabled={saving}
              style={{ padding: "10px 28px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab: 個人情報 ─── */}
      {activeTab === "personal" && (
        <div>
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#664d03" }}>
            ⚠️ このタブの情報は機密情報です。ADMIN権限者のみ閲覧・編集してください。
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>基本個人情報</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>生年月日</label>
                <input style={inp} type="date" value={form.birth_date ? form.birth_date.slice(0, 10) : ""} onChange={e => setF("birth_date", e.target.value || null)} />
              </div>
              <div style={row}>
                <label style={lbl}>性別</label>
                <select style={inp} value={form.gender ?? ""} onChange={e => setF("gender", e.target.value || null)}>
                  <option value="">未設定</option>
                  <option value="M">男性</option>
                  <option value="F">女性</option>
                  <option value="OTHER">その他</option>
                </select>
              </div>
              <div style={row}>
                <label style={lbl}>血液型</label>
                <select style={inp} value={form.blood_type ?? ""} onChange={e => setF("blood_type", e.target.value || null)}>
                  <option value="">未設定</option>
                  <option value="A">A型</option>
                  <option value="B">B型</option>
                  <option value="O">O型</option>
                  <option value="AB">AB型</option>
                </select>
              </div>
              <div style={row}>
                <label style={lbl}>年収（万円）</label>
                <input style={inp} type="number" value={form.annual_salary ?? ""} onChange={e => setF("annual_salary", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>個人連絡先</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>個人メール</label>
                <input style={inp} type="email" value={form.email_personal ?? ""} onChange={e => setF("email_personal", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>個人電話</label>
                <input style={inp} value={form.tel_personal ?? ""} onChange={e => setF("tel_personal", e.target.value)} />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>住所</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>郵便番号</label>
                <input style={inp} value={form.postal_code ?? ""} onChange={e => setF("postal_code", e.target.value)} placeholder="123-4567" />
              </div>
              <div style={row}>
                <label style={lbl}>都道府県</label>
                <input style={inp} value={form.prefecture ?? ""} onChange={e => setF("prefecture", e.target.value)} placeholder="東京都" />
              </div>
              <div style={row}>
                <label style={lbl}>市区町村</label>
                <input style={inp} value={form.city ?? ""} onChange={e => setF("city", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>番地以降</label>
                <input style={inp} value={form.address ?? ""} onChange={e => setF("address", e.target.value)} />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>緊急連絡先</div>
            <div style={grid2}>
              <div style={row}>
                <label style={lbl}>氏名</label>
                <input style={inp} value={form.emergency_contact ?? ""} onChange={e => setF("emergency_contact", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>電話番号</label>
                <input style={inp} value={form.emergency_tel ?? ""} onChange={e => setF("emergency_tel", e.target.value)} />
              </div>
              <div style={row}>
                <label style={lbl}>続柄</label>
                <input style={inp} value={form.emergency_relation ?? ""} onChange={e => setF("emergency_relation", e.target.value)} placeholder="配偶者・父・母など" />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => handleSave()} disabled={saving}
              style={{ padding: "10px 28px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab: 担当物件 ─── */}
      {activeTab === "properties" && (
        <div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>
            担当物件数: <strong style={{ color: "#1c1b18" }}>{staff._count?.properties_as_agent ?? 0}</strong>件
          </div>
          {!propertiesLoaded ? (
            <div style={{ color: "#aaa", padding: 24 }}>読み込み中...</div>
          ) : properties.length === 0 ? (
            <div style={{ color: "#aaa", padding: 24 }}>担当物件はありません</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e0deda" }}>
              <thead>
                <tr style={{ background: "#f8f6f3" }}>
                  {["物件番号", "所在地", "ステータス", "価格（万円）", "掲載日数", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #e0deda" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {properties.map(p => {
                  const days = p.published_at ? Math.floor((Date.now() - new Date(p.published_at).getTime()) / 86400000) : null;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f2f1ed" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{p.property_number ?? "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{p.city}{p.town ? ` ${p.town}` : ""}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, background: "#f7f6f2", padding: "3px 8px", borderRadius: 8 }}>{STATUS_LABELS[p.status] ?? p.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{p.price.toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#888" }}>{days !== null ? `${days}日` : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <a href={`/admin/properties/${p.id}`} style={{ fontSize: 12, color: "#8c1f1f", textDecoration: "none" }}>詳細</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Tab: 退職処理 ─── */}
      {activeTab === "retire" && (
        <div>
          {!staff.is_active ? (
            <div style={section}>
              <div style={{ fontSize: 14, color: "#888" }}>このスタッフは退職済みです。</div>
              {staff.retirement_date && <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>退職日: {new Date(staff.retirement_date).toLocaleDateString("ja-JP")}</div>}
              {staff.retirement_reason && <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>退職理由: {staff.retirement_reason}</div>}
            </div>
          ) : (
            <>
              <div style={{ background: "#fff7f7", border: "1px solid #fcc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#8c1f1f" }}>
                ⚠️ 退職処理を実行すると、担当物件 <strong>{staff._count?.properties_as_agent ?? 0}件</strong> が引継ぎ先スタッフに移管されます。この操作は取り消せません。
              </div>

              <div style={section}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>退職情報</div>
                <div style={grid2}>
                  <div style={row}>
                    <label style={lbl}>退職日</label>
                    <input style={inp} type="date" value={retireDate} onChange={e => setRetireDate(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", ...row }}>
                    <label style={lbl}>退職理由</label>
                    <input style={inp} value={retireReason} onChange={e => setRetireReason(e.target.value)} placeholder="自己都合退職・定年退職など" />
                  </div>
                </div>
              </div>

              {(staff._count?.properties_as_agent ?? 0) > 0 && (
                <div style={section}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#3a2a1a" }}>担当物件の引継ぎ（{staff._count?.properties_as_agent ?? 0}件）</div>
                  <div style={row}>
                    <label style={lbl}>一括引継ぎ先スタッフ <span style={{ color: "#8c1f1f" }}>*</span></label>
                    <select style={inp} value={successorId} onChange={e => setSuccessorId(e.target.value)}>
                      <option value="">引継ぎ先を選択してください</option>
                      {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={handleRetire} disabled={retiring}
                  style={{ padding: "10px 28px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: retiring ? "not-allowed" : "pointer", opacity: retiring ? 0.7 : 1 }}>
                  {retiring ? "処理中..." : "退職処理を実行する"}
                </button>
              </div>
            </>
          )}

          {/* 危険な操作: ADMIN のみ */}
          {isAdmin && (
            <div style={{ marginTop: 24, padding: 20, border: "1px solid #ffcdd2", borderRadius: 12, background: "#fff5f5" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#c62828", marginBottom: 8 }}>⚠️ 危険な操作</div>
              <p style={{ fontSize: 13, color: "#706e68", marginBottom: 16 }}>
                スタッフを削除すると管理画面にログインできなくなります。担当物件がある場合は先に退職処理で引継ぎを行ってください。
              </p>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#c62828", color: "#fff", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
                {deleting ? "処理中..." : "🗑️ このスタッフを削除する"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
