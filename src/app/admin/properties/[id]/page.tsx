"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き", REVIEW: "AI確認中", PENDING: "承認待ち",
  APPROVED: "承認済み", PUBLISHED_HP: "HP掲載中",
  PUBLISHED_ALL: "全媒体掲載", SUSPENDED: "一時停止", SOLD: "成約済み",
};

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  DRAFT:         { background: "#f3f2ef", color: "#706e68" },
  REVIEW:        { background: "#fff7cc", color: "#7a5c00" },
  PENDING:       { background: "#fff0e5", color: "#c05600" },
  APPROVED:      { background: "#e6f4ea", color: "#1a7737" },
  PUBLISHED_HP:  { background: "#e3f0ff", color: "#1a56a0" },
  PUBLISHED_ALL: { background: "#234f35", color: "#fff" },
  SUSPENDED:     { background: "#f3f2ef", color: "#706e68" },
  SOLD:          { background: "#fdeaea", color: "#8c1f1f" },
};

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

type Action = { label: string; next: string; confirm?: string; danger?: boolean };

const STATUS_ACTIONS: Record<string, Action[]> = {
  DRAFT:         [{ label: "AI確認に送る", next: "REVIEW" }],
  REVIEW:        [{ label: "承認待ちに設定", next: "PENDING" }],
  PENDING:       [{ label: "広告確認を承認", next: "APPROVED", confirm: "広告確認を承認します。承認後は掲載設定が可能になります。よろしいですか？" }],
  APPROVED: [
    { label: "HP掲載開始", next: "PUBLISHED_HP", confirm: "HPへの掲載を開始します。よろしいですか？" },
    { label: "全媒体掲載", next: "PUBLISHED_ALL", confirm: "HP・全ポータルサイトへの掲載を開始します。よろしいですか？" },
  ],
  PUBLISHED_HP: [
    { label: "全媒体に拡大", next: "PUBLISHED_ALL", confirm: "全ポータルへの掲載を追加します。よろしいですか？" },
    { label: "一時停止", next: "SUSPENDED", confirm: "掲載を一時停止します。よろしいですか？", danger: true },
    { label: "成約確定", next: "SOLD", confirm: "成約を確定します。すべての掲載が終了します。この操作は取り消せません。", danger: true },
  ],
  PUBLISHED_ALL: [
    { label: "一時停止", next: "SUSPENDED", confirm: "掲載を一時停止します。よろしいですか？", danger: true },
    { label: "成約確定", next: "SOLD", confirm: "成約を確定します。すべての掲載が終了します。この操作は取り消せません。", danger: true },
  ],
  SUSPENDED: [
    { label: "HP掲載再開", next: "PUBLISHED_HP", confirm: "HP掲載を再開します。よろしいですか？" },
    { label: "全媒体再開", next: "PUBLISHED_ALL", confirm: "全媒体への掲載を再開します。よろしいですか？" },
    { label: "成約確定", next: "SOLD", confirm: "成約を確定します。すべての掲載が終了します。この操作は取り消せません。", danger: true },
  ],
  SOLD: [],
};

interface Property {
  id: string; property_type: string; status: string;
  prefecture: string; city: string; address: string;
  price: number; station_line: string | null; station_name: string; station_walk: number;
  area_land_m2: number | null; area_build_m2: number | null; area_exclusive_m2: number | null;
  rooms: string | null; building_year: number | null; structure: string | null;
  delivery_timing: string | null; management_fee: number | null; repair_reserve: number | null;
  reins_number: string | null; published_hp: boolean; published_suumo: boolean; published_athome: boolean;
  compliance_checked: boolean; agent_id: string | null; created_at: string;
}

const inputSt: React.CSSProperties = {
  padding: "5px 10px", border: "1px solid #e0deda", borderRadius: 6,
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
      <span style={{ fontSize: 11, color: "#706e68", width: 90, flexShrink: 0, paddingTop: 3 }}>{label}</span>
      <div style={{ flex: 1, fontSize: 13 }}>{children}</div>
    </div>
  );
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setProperty(d.property); setForm(d.property ?? {}); })
      .catch(() => setError("物件情報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const setF = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "更新に失敗しました"); return; }
      setProperty(data.property);
      setForm(data.property);
      setEditing(false);
    } catch { setError("通信エラーが発生しました"); }
    finally { setSaving(false); }
  };

  const handleTransition = async (next: string) => {
    setTransitioning(true);
    setError("");
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "ステータス変更に失敗しました"); return; }
      setProperty(data.property);
      setForm(data.property);
    } catch { setError("通信エラーが発生しました"); }
    finally { setTransitioning(false); }
  };

  if (loading) return <div style={{ padding: 28, color: "#706e68", fontSize: 13 }}>読み込み中...</div>;
  if (!property) return <div style={{ padding: 28, color: "#8c1f1f", fontSize: 13 }}>物件が見つかりません</div>;

  const badgeStyle = STATUS_BADGE[property.status] ?? { background: "#f3f2ef", color: "#706e68" };
  const actions = STATUS_ACTIONS[property.status] ?? [];

  return (
    <div style={{ padding: 28, maxWidth: 920 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ fontSize: 12, color: "#706e68", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "inherit" }}>← 物件一覧</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>
            {TYPE_LABELS[property.property_type] ?? property.property_type}｜{property.city}{property.address}
          </h1>
          <span style={{ ...badgeStyle, padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
            {STATUS_LABELS[property.status] ?? property.status}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>
          {property.station_name} 徒歩{property.station_walk}分　登録日: {new Date(property.created_at).toLocaleDateString("ja-JP")}
        </p>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#8c1f1f", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Status workflow */}
      {actions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#706e68", letterSpacing: ".06em", textTransform: "uppercase" }}>ステータス操作</span>
          {actions.map((action) => (
            <button key={action.next}
              onClick={() => action.confirm ? setConfirmAction(action) : handleTransition(action.next)}
              disabled={transitioning}
              style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: action.danger ? "#8c1f1f" : "#234f35", color: "#fff", border: "none", cursor: transitioning ? "not-allowed" : "pointer", opacity: transitioning ? 0.6 : 1, fontFamily: "inherit" }}>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Edit controls */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>編集</button>
        ) : (
          <>
            <button onClick={() => { setEditing(false); setForm(property as Record<string, unknown>); }} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: saving ? "#888" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "保存中..." : "保存する"}
            </button>
          </>
        )}
      </div>

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="基本情報">
            <Row label="物件種別">
              {editing ? (
                <select value={String(form.property_type ?? "")} onChange={(e) => setF("property_type", e.target.value)} style={inputSt}>
                  <option value="NEW_HOUSE">新築戸建</option>
                  <option value="USED_HOUSE">中古戸建</option>
                  <option value="MANSION">マンション</option>
                  <option value="NEW_MANSION">新築マンション</option>
                  <option value="LAND">土地</option>
                </select>
              ) : <span>{TYPE_LABELS[property.property_type] ?? property.property_type}</span>}
            </Row>
            <Row label="価格">
              {editing ? (
                <input type="number" value={String(form.price ?? "")} onChange={(e) => setF("price", Number(e.target.value))} style={inputSt} />
              ) : <span style={{ fontWeight: 600 }}>{property.price.toLocaleString()}万円</span>}
            </Row>
            <Row label="所在地">
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={String(form.city ?? "")} onChange={(e) => setF("city", e.target.value)} placeholder="市区町村" style={inputSt} />
                  <input value={String(form.address ?? "")} onChange={(e) => setF("address", e.target.value)} placeholder="番地以降" style={inputSt} />
                </div>
              ) : <span>{property.prefecture}{property.city}{property.address}</span>}
            </Row>
            <Row label="最寄駅">
              {editing ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={String(form.station_line ?? "")} onChange={(e) => setF("station_line", e.target.value)} placeholder="路線" style={{ ...inputSt, width: "50%" }} />
                  <input value={String(form.station_name ?? "")} onChange={(e) => setF("station_name", e.target.value)} placeholder="駅名" style={{ ...inputSt, width: "50%" }} />
                </div>
              ) : <span>{property.station_line ? `${property.station_line} ` : ""}{property.station_name} 徒歩{property.station_walk}分</span>}
            </Row>
          </Card>

          <Card title="物件詳細">
            <Row label="間取り">
              {editing ? <input value={String(form.rooms ?? "")} onChange={(e) => setF("rooms", e.target.value)} style={inputSt} /> : <span>{property.rooms || "—"}</span>}
            </Row>
            <Row label="建物面積">
              {editing ? <input type="number" value={String(form.area_build_m2 ?? "")} onChange={(e) => setF("area_build_m2", Number(e.target.value))} style={inputSt} /> : <span>{property.area_build_m2 ? `${property.area_build_m2}㎡` : "—"}</span>}
            </Row>
            <Row label="土地面積">
              {editing ? <input type="number" value={String(form.area_land_m2 ?? "")} onChange={(e) => setF("area_land_m2", Number(e.target.value))} style={inputSt} /> : <span>{property.area_land_m2 ? `${property.area_land_m2}㎡` : "—"}</span>}
            </Row>
            <Row label="築年">
              {editing ? <input type="number" value={String(form.building_year ?? "")} onChange={(e) => setF("building_year", Number(e.target.value))} style={inputSt} /> : <span>{property.building_year ? `${property.building_year}年` : "—"}</span>}
            </Row>
            <Row label="構造">
              {editing ? <input value={String(form.structure ?? "")} onChange={(e) => setF("structure", e.target.value)} style={inputSt} /> : <span>{property.structure || "—"}</span>}
            </Row>
            <Row label="引渡し時期">
              {editing ? <input value={String(form.delivery_timing ?? "")} onChange={(e) => setF("delivery_timing", e.target.value)} style={inputSt} /> : <span>{property.delivery_timing || "—"}</span>}
            </Row>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="費用">
            <Row label="管理費">
              {editing ? <input type="number" value={String(form.management_fee ?? "")} onChange={(e) => setF("management_fee", Number(e.target.value))} style={inputSt} /> : <span>{property.management_fee ? `${property.management_fee.toLocaleString()}円/月` : "—"}</span>}
            </Row>
            <Row label="修繕積立金">
              {editing ? <input type="number" value={String(form.repair_reserve ?? "")} onChange={(e) => setF("repair_reserve", Number(e.target.value))} style={inputSt} /> : <span>{property.repair_reserve ? `${property.repair_reserve.toLocaleString()}円/月` : "—"}</span>}
            </Row>
          </Card>

          <Card title="掲載状況">
            {(["published_hp", "published_suumo", "published_athome"] as const).map((key) => {
              const labels: Record<string, string> = { published_hp: "HP（フェリアホーム）", published_suumo: "SUUMO", published_athome: "at home" };
              const active = !!(property as Record<string, unknown>)[key];
              return (
                <Row key={key} label={labels[key]}>
                  <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: active ? "#e6f4ea" : "#f3f2ef", color: active ? "#1a7737" : "#706e68" }}>
                    {active ? "掲載中" : "未掲載"}
                  </span>
                </Row>
              );
            })}
          </Card>

          <Card title="管理情報">
            <Row label="レインズ番号">
              {editing ? <input value={String(form.reins_number ?? "")} onChange={(e) => setF("reins_number", e.target.value)} style={inputSt} /> : <span>{property.reins_number || "—"}</span>}
            </Row>
            <Row label="広告確認">
              <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: property.compliance_checked ? "#e6f4ea" : "#fff0e5", color: property.compliance_checked ? "#1a7737" : "#c05600" }}>
                {property.compliance_checked ? "確認済み" : "未確認"}
              </span>
            </Row>
            <Row label="担当者ID"><span style={{ fontSize: 11, color: "#706e68" }}>{property.agent_id || "—"}</span></Row>
            <Row label="物件ID"><span style={{ fontSize: 11, color: "#706e68", fontFamily: "monospace" }}>{property.id}</span></Row>
          </Card>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>{confirmAction.label}</h3>
            <p style={{ fontSize: 13, color: "#706e68", marginBottom: 24, lineHeight: 1.7 }}>{confirmAction.confirm}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
              <button onClick={() => handleTransition(confirmAction.next)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: confirmAction.danger ? "#8c1f1f" : "#234f35", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                確認して実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
