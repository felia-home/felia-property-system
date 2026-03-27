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

interface Customer {
  id: string; name: string; name_kana: string | null;
  email: string | null; phone: string | null;
  budget_min: number | null; budget_max: number | null;
  area_preferences: unknown; property_type_pref: string | null;
  rooms_pref: string | null; area_m2_pref: number | null;
  status: string; notes: string | null; source: string | null;
  assigned_agent_id: string | null;
  last_contacted_at: string | null; next_action_date: string | null; next_action_note: string | null;
  created_at: string;
}

interface MatchingProperty {
  id: string; property_type: string; status: string;
  city: string; address: string; station_name: string; station_walk: number;
  price: number; rooms: string | null; area_build_m2: number | null;
}

const inputSt: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 6,
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#706e68", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #e0deda" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: "#706e68", width: 100, flexShrink: 0, paddingTop: 3 }}>{label}</span>
      <div style={{ flex: 1, fontSize: 13 }}>{children}</div>
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [matchingProps, setMatchingProps] = useState<MatchingProperty[]>([]);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setCustomer(d.customer); setForm(d.customer ?? {}); })
      .catch(() => setError("顧客情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Fetch matching properties when customer loads
  useEffect(() => {
    if (!customer) return;
    fetch("/api/properties?status=APPROVED")
      .then((r) => r.json())
      .then((d) => {
        const props: MatchingProperty[] = d.properties ?? [];
        const matched = props.filter((p) => {
          if (customer.budget_max && p.price > customer.budget_max) return false;
          if (customer.budget_min && p.price < customer.budget_min) return false;
          if (customer.property_type_pref && p.property_type !== customer.property_type_pref) return false;
          return true;
        }).slice(0, 5);
        setMatchingProps(matched);
      })
      .catch(() => {});
  }, [customer]);

  const setF = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "更新に失敗しました"); return; }
      setCustomer(data.customer);
      setForm(data.customer);
      setEditing(false);
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const handleContactUpdate = async () => {
    const res = await fetch(`/api/customers/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_contacted_at: new Date().toISOString(),
        next_action_date: form.next_action_date,
        next_action_note: form.next_action_note,
      }),
    });
    const data = await res.json();
    if (res.ok) { setCustomer(data.customer); setForm(data.customer); }
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!customer) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>顧客が見つかりません</div>;

  const badge = STATUS_BADGE[customer.status] ?? { background: "#f3f2ef", color: "#706e68" };

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
        </div>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          登録日: {new Date(customer.created_at).toLocaleDateString("ja-JP")}
          {customer.source && `　経路: ${customer.source}`}
        </p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Edit controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>編集</button>
        ) : (
          <>
            <button onClick={() => { setEditing(false); setForm(customer as unknown as Record<string, unknown>); }} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="基本情報">
            <Row label="氏名">
              {editing ? <input value={String(form.name ?? "")} onChange={(e) => setF("name", e.target.value)} style={inputSt} /> : <span>{customer.name}</span>}
            </Row>
            <Row label="フリガナ">
              {editing ? <input value={String(form.name_kana ?? "")} onChange={(e) => setF("name_kana", e.target.value)} style={inputSt} /> : <span>{customer.name_kana || "—"}</span>}
            </Row>
            <Row label="メール">
              {editing ? <input type="email" value={String(form.email ?? "")} onChange={(e) => setF("email", e.target.value)} style={inputSt} /> : <span>{customer.email || "—"}</span>}
            </Row>
            <Row label="電話">
              {editing ? <input value={String(form.phone ?? "")} onChange={(e) => setF("phone", e.target.value)} style={inputSt} /> : <span>{customer.phone || "—"}</span>}
            </Row>
            <Row label="ステータス">
              {editing ? (
                <select value={String(form.status ?? "lead")} onChange={(e) => setF("status", e.target.value)} style={inputSt}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : <span>{STATUS_LABELS[customer.status] ?? customer.status}</span>}
            </Row>
          </Card>

          <Card title="希望条件">
            <Row label="予算">
              {editing ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="number" value={String(form.budget_min ?? "")} onChange={(e) => setF("budget_min", Number(e.target.value))} placeholder="下限" style={{ ...inputSt, width: "45%" }} />
                  <span style={{ fontSize: 12, color: "#706e68" }}>〜</span>
                  <input type="number" value={String(form.budget_max ?? "")} onChange={(e) => setF("budget_max", Number(e.target.value))} placeholder="上限" style={{ ...inputSt, width: "45%" }} />
                  <span style={{ fontSize: 11, color: "#706e68" }}>万円</span>
                </div>
              ) : (
                <span>
                  {customer.budget_min || customer.budget_max
                    ? `${customer.budget_min?.toLocaleString() ?? "?"}〜${customer.budget_max?.toLocaleString() ?? "?"}万円`
                    : "—"}
                </span>
              )}
            </Row>
            <Row label="物件種別">
              {editing ? (
                <select value={String(form.property_type_pref ?? "")} onChange={(e) => setF("property_type_pref", e.target.value)} style={inputSt}>
                  <option value="">指定なし</option>
                  <option value="USED_HOUSE">中古戸建</option>
                  <option value="NEW_HOUSE">新築戸建</option>
                  <option value="MANSION">マンション</option>
                  <option value="LAND">土地</option>
                </select>
              ) : <span>{customer.property_type_pref ? (TYPE_LABELS[customer.property_type_pref] ?? customer.property_type_pref) : "指定なし"}</span>}
            </Row>
            <Row label="希望間取り">
              {editing ? <input value={String(form.rooms_pref ?? "")} onChange={(e) => setF("rooms_pref", e.target.value)} placeholder="3LDK以上" style={inputSt} /> : <span>{customer.rooms_pref || "—"}</span>}
            </Row>
          </Card>

          {customer.notes && (
            <Card title="備考">
              <p style={{ fontSize: 13, color: "#1c1b18", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{customer.notes}</p>
            </Card>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Follow-up tracking */}
          <Card title="追客状況">
            <Row label="最終連絡日">
              <span>{customer.last_contacted_at ? new Date(customer.last_contacted_at).toLocaleDateString("ja-JP") : "—"}</span>
            </Row>
            <Row label="次回アクション日">
              <input type="date" value={String(form.next_action_date ? new Date(String(form.next_action_date)).toISOString().split("T")[0] : "")}
                onChange={(e) => setF("next_action_date", e.target.value)} style={inputSt} />
            </Row>
            <Row label="アクション内容">
              <input value={String(form.next_action_note ?? "")} onChange={(e) => setF("next_action_note", e.target.value)} placeholder="電話フォロー・物件紹介など" style={inputSt} />
            </Row>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={handleContactUpdate} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                連絡済みとして記録
              </button>
            </div>
          </Card>

          {/* Matching properties */}
          <Card title="マッチング物件">
            {matchingProps.length === 0 ? (
              <p style={{ fontSize: 12, color: "#706e68" }}>
                {customer.budget_min || customer.budget_max ? "条件に合う掲載中物件はありません" : "予算を設定するとマッチング物件が表示されます"}
              </p>
            ) : (
              matchingProps.map((p) => (
                <div key={p.id} style={{ padding: "10px 12px", background: "#f7f6f2", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{TYPE_LABELS[p.property_type] ?? p.property_type}｜{p.city}{p.address}</div>
                      <div style={{ fontSize: 11, color: "#706e68", marginTop: 2 }}>
                        {p.station_name} 徒歩{p.station_walk}分{p.rooms ? `　${p.rooms}` : ""}{p.area_build_m2 ? `　${p.area_build_m2}㎡` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#234f35" }}>{p.price.toLocaleString()}万円</div>
                      <a href={`/admin/properties/${p.id}`} style={{ fontSize: 11, color: "#234f35" }}>詳細</a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
