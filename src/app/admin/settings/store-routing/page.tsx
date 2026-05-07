"use client";
import { useState, useEffect } from "react";

const RULE_TYPE_LABELS: Record<string, string> = {
  AREA:          "エリア（区）",
  STATION_LINE:  "沿線・駅名",
  PROPERTY_TYPE: "物件種別",
  DEFAULT:       "デフォルト",
};

const RULE_TYPE_COLORS: Record<string, string> = {
  AREA:          "#1d4ed8",
  STATION_LINE:  "#7c3aed",
  PROPERTY_TYPE: "#0891b2",
  DEFAULT:       "#6b7280",
};

const PROPERTY_TYPE_OPTIONS = [
  { value: "MANSION",     label: "中古マンション" },
  { value: "NEW_MANSION", label: "新築マンション" },
  { value: "USED_HOUSE",  label: "中古戸建て" },
  { value: "NEW_HOUSE",   label: "新築戸建て" },
  { value: "LAND",        label: "土地" },
];

interface Rule {
  id: string;
  store_id: string;
  rule_type: string;
  rule_value: string;
  priority: number;
  is_active: boolean;
  store: { id: string; name: string };
}

interface Store {
  id: string;
  name: string;
}

export default function StoreRoutingPage() {
  const [rules, setRules]       = useState<Rule[]>([]);
  const [stores, setStores]     = useState<Store[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    store_id:   "",
    rule_type:  "AREA",
    rule_value: "",
    priority:   10,
    is_active:  true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store-routing");
      const data = await res.json();
      setRules(data.rules ?? []);
      setStores(data.stores ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleAdd = async () => {
    if (!form.store_id) { alert("店舗を選択してください"); return; }
    const value = form.rule_type === "DEFAULT" ? "DEFAULT" : form.rule_value.trim();
    if (!value) { alert("条件値を入力してください"); return; }

    const res = await fetch("/api/admin/store-routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rule_value: value }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "追加に失敗しました");
      return;
    }
    setShowForm(false);
    setForm({ store_id: "", rule_type: "AREA", rule_value: "", priority: 10, is_active: true });
    await load();
  };

  const handleToggle = async (rule: Rule) => {
    await fetch(`/api/admin/store-routing/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このルールを削除しますか？")) return;
    await fetch(`/api/admin/store-routing/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>🔀 会員自動割り振り設定</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            HP会員登録時の希望条件に基づいて担当店舗を自動設定します
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            padding: "8px 18px", borderRadius: 6, border: "none",
            background: "#5BAD52", color: "#fff", fontSize: 13,
            fontWeight: "bold", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ＋ ルール追加
        </button>
      </div>

      {showForm && (
        <div style={{
          padding: 20, marginBottom: 20,
          background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 16 }}>新しいルールを追加</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                条件種別
              </label>
              <select
                value={form.rule_type}
                onChange={e => setForm({ ...form, rule_type: e.target.value, rule_value: "" })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              >
                {Object.entries(RULE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                条件値
              </label>
              {form.rule_type === "PROPERTY_TYPE" ? (
                <select
                  value={form.rule_value}
                  onChange={e => setForm({ ...form, rule_value: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                >
                  <option value="">選択してください</option>
                  {PROPERTY_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : form.rule_type === "DEFAULT" ? (
                <input
                  value="DEFAULT"
                  disabled
                  readOnly
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#f9fafb", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              ) : (
                <input
                  value={form.rule_value}
                  onChange={e => setForm({ ...form, rule_value: e.target.value })}
                  placeholder={form.rule_type === "AREA" ? "例: 渋谷区" : "例: 京王線"}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                割り振り先店舗
              </label>
              <select
                value={form.store_id}
                onChange={e => setForm({ ...form, store_id: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              >
                <option value="">選択してください</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
              優先度（数値が大きいほど優先）
            </label>
            <input
              type="number"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: parseInt(e.target.value || "0", 10) })}
              style={{ width: 100, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
            />
            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>
              エリア&gt;沿線&gt;物件種別&gt;デフォルト の順を想定（例: 30 &gt; 20 &gt; 10 &gt; 0）
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleAdd}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none",
                background: "#5BAD52", color: "#fff", fontSize: 13,
                fontWeight: "bold", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: "8px 20px", borderRadius: 6,
                border: "1px solid #d1d5db", background: "#fff",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div style={{
        padding: "12px 16px", marginBottom: 20,
        background: "#eff6ff", border: "1px solid #bfdbfe",
        borderRadius: 8, fontSize: 12, color: "#1d4ed8",
      }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>💡 割り振りの仕組み</div>
        会員登録時に希望エリア・希望沿線・希望物件種別を照合し、
        優先度の高いルールにマッチした店舗に自動割り振りします。
        どのルールにもマッチしない場合は「デフォルト」ルールの店舗が選ばれます。
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>読み込み中...</div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          ルールが登録されていません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              padding: "12px 16px", background: "#fff",
              border: `1px solid ${rule.is_active ? "#e5e7eb" : "#f3f4f6"}`,
              borderRadius: 8,
              opacity: rule.is_active ? 1 : 0.5,
            }}>
              <span style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: "bold",
                background: `${RULE_TYPE_COLORS[rule.rule_type]}15`,
                color: RULE_TYPE_COLORS[rule.rule_type],
                minWidth: 100, textAlign: "center",
              }}>
                {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
              </span>

              <span style={{ fontSize: 14, fontWeight: "bold", flex: 1, minWidth: 120, color: "#374151" }}>
                {rule.rule_value === "DEFAULT" ? "（すべて）" : rule.rule_value}
              </span>

              <span style={{ color: "#9ca3af", fontSize: 18 }}>→</span>

              <span style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 13,
                background: "#f0fdf4", color: "#166534", fontWeight: "bold",
                minWidth: 120, textAlign: "center",
              }}>
                {rule.store.name}
              </span>

              <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 60 }}>
                優先度 {rule.priority}
              </span>

              <button
                type="button"
                onClick={() => handleToggle(rule)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  border: `1px solid ${rule.is_active ? "#86efac" : "#d1d5db"}`,
                  background: rule.is_active ? "#f0fdf4" : "#f9fafb",
                  color: rule.is_active ? "#166534" : "#9ca3af",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {rule.is_active ? "✅ 有効" : "⏸ 無効"}
              </button>

              {rule.rule_type !== "DEFAULT" && (
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11,
                    border: "1px solid #fca5a5", background: "#fff",
                    color: "#ef4444", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
