"use client";
import { useEffect, useState, useRef, useCallback } from "react";

interface Commission {
  id: string;
  label: string;
  value: string;
  sort_order: number;
}

interface Staff {
  id: string;
  name: string;
}

interface PrivateProperty {
  id: string;
  property_no: string;
  listing_type: string;
  is_land: boolean;
  is_house: boolean;
  is_mansion: boolean;
  area: string | null;
  town: string | null;
  price: number | null;
  area_land_m2: number | null;
  area_build_m2: number | null;
  commission: string | null;
  note: string | null;
  seller_name: string | null;
  agent: { id: string; name: string } | null;
  myosoku_url: string | null;
  myosoku_filename: string | null;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── 新規作成モーダル ────────────────────────────────────────────────────────────

interface NewModalProps {
  commissions: Commission[];
  staffList: Staff[];
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
}

function NewModal({ commissions, staffList, onClose, onCreate }: NewModalProps) {
  const [form, setForm] = useState({
    listing_type: "SENIN",
    property_type: "house",
    area: "",
    town: "",
    price: "",
    commission: "",
    area_land_m2: "",
    area_build_m2: "",
    seller_name: "",
    agent_id: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onCreate({
      listing_type: form.listing_type,
      is_land:      form.property_type === "land",
      is_house:     form.property_type === "house",
      is_mansion:   form.property_type === "mansion",
      area:         form.area || null,
      town:         form.town || null,
      price:        form.price ? Number(form.price) : null,
      commission:   form.commission || null,
      area_land_m2: form.area_land_m2 ? Number(form.area_land_m2) : null,
      area_build_m2: form.area_build_m2 ? Number(form.area_build_m2) : null,
      seller_name:  form.seller_name || null,
      agent_id:     form.agent_id || null,
      note:         form.note || null,
    });
    setSaving(false);
  };

  const fieldSt: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const labelSt: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 500 };
  const inputSt: React.CSSProperties = { padding: "7px 10px", border: "1px solid #ddd", borderRadius: 5, fontSize: 13, fontFamily: "inherit" };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>未公開物件 新規登録</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={fieldSt}>
            <label style={labelSt}>未公開区分 *</label>
            <select value={form.listing_type} onChange={e => setForm(f => ({ ...f, listing_type: e.target.value }))} style={inputSt}>
              <option value="SENIN">専任</option>
              <option value="PRIVATE">未公開・レインズ非公開</option>
            </select>
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>物件種別 *</label>
            <div style={{ display: "flex", gap: 20 }}>
              {[["land", "土地"], ["house", "戸建て"], ["mansion", "マンション"]].map(([v, l]) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="property_type" value={v} checked={form.property_type === v}
                    onChange={() => setForm(f => ({ ...f, property_type: v }))} />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div style={grid2}>
            <div style={fieldSt}>
              <label style={labelSt}>区（エリア）</label>
              <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                placeholder="例: 杉並区" style={inputSt} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>町名</label>
              <input value={form.town} onChange={e => setForm(f => ({ ...f, town: e.target.value }))}
                placeholder="例: 善福寺1丁目" style={inputSt} />
            </div>
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>価格（万円）</label>
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="14500" style={inputSt} />
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>手数料</label>
            <select value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} style={inputSt}>
              <option value="">選択してください</option>
              {commissions.map(c => <option key={c.id} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div style={grid2}>
            <div style={fieldSt}>
              <label style={labelSt}>土地面積（㎡）</label>
              <input type="number" value={form.area_land_m2} onChange={e => setForm(f => ({ ...f, area_land_m2: e.target.value }))} style={inputSt} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>建物面積（㎡）</label>
              <input type="number" value={form.area_build_m2} onChange={e => setForm(f => ({ ...f, area_build_m2: e.target.value }))} style={inputSt} />
            </div>
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>売主・元付業者名</label>
            <input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))}
              placeholder="例: ヒロコーポレーション" style={inputSt} />
          </div>

          {staffList.length > 0 && (
            <div style={fieldSt}>
              <label style={labelSt}>担当者</label>
              <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))} style={inputSt}>
                <option value="">未割当</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div style={fieldSt}>
            <label style={labelSt}>備考</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3} style={{ ...inputSt, resize: "vertical" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            キャンセル
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 2, padding: "10px 0", borderRadius: 7, background: saving ? "#888" : "#1565c0", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
            {saving ? "登録中..." : "登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 物件行コンポーネント ───────────────────────────────────────────────────────

interface PropertyRowProps {
  property: PrivateProperty;
  commissions: Commission[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onConfirm: (id: string) => void;
  onClose: (id: string) => void;
  onUploadMyosoku: (id: string, file: File) => void;
  onShowAddCommission: () => void;
}

function PropertyRow({
  property, commissions, onUpdate, onConfirm, onClose,
  onUploadMyosoku, onShowAddCommission,
}: PropertyRowProps) {
  const [commission, setCommission] = useState(property.commission ?? "");
  const [note, setNote] = useState(property.note ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if parent updates
  useEffect(() => { setCommission(property.commission ?? ""); }, [property.commission]);
  useEffect(() => { setNote(property.note ?? ""); }, [property.note]);

  const isClosed = property.status === "CLOSED";
  const propType = property.is_land ? "土地" : property.is_mansion ? "マンション" : "戸建て";
  const listingLabel = property.listing_type === "PRIVATE" ? "未公開" : "専任";

  const rowStyle: React.CSSProperties = {
    background: isClosed ? "#f5f5f5" : "#fff",
    border: "1px solid #ddd", borderTop: "none",
    padding: "8px 10px",
    opacity: isClosed ? 0.72 : 1,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "80px 170px 90px 110px 1fr 110px 160px 200px",
    gap: 8,
    alignItems: "start",
  };

  return (
    <div style={rowStyle}>
      <div style={gridStyle}>
        {/* 物件NO・日付 */}
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: "#1565c0", fontSize: 13 }}>{property.property_no}</div>
          <div style={{ color: "#888", marginTop: 2 }}>
            {new Date(property.created_at).toLocaleDateString("ja-JP")}
          </div>
          <div style={{ color: "#aaa" }}>
            {new Date(property.updated_at).toLocaleDateString("ja-JP")}
          </div>
        </div>

        {/* 未公開区分・物件種別 */}
        <div>
          <select
            value={property.listing_type}
            onChange={e => onUpdate(property.id, { listing_type: e.target.value })}
            style={{ fontSize: 11, padding: "2px 4px", marginBottom: 5, border: "1px solid #ddd", borderRadius: 4, fontFamily: "inherit", width: "100%" }}
          >
            <option value="SENIN">専任</option>
            <option value="PRIVATE">未公開・レインズ非公開</option>
          </select>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            {[["is_land", "土地"], ["is_house", "戸建て"], ["is_mansion", "マンション"]].map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <input type="radio"
                  checked={property[key as "is_land" | "is_house" | "is_mansion"]}
                  onChange={() => onUpdate(property.id, {
                    is_land: key === "is_land",
                    is_house: key === "is_house",
                    is_mansion: key === "is_mansion",
                  })}
                />
                {label}
              </label>
            ))}
          </div>
          {property.area_land_m2 != null && (
            <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
              土地 {property.area_land_m2}㎡
            </div>
          )}
          {property.seller_name && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>売主: {property.seller_name}</div>
          )}
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{listingLabel} / {propType}</div>
        </div>

        {/* 区 */}
        <div style={{ fontSize: 13, fontWeight: 500 }}>{property.area ?? "—"}</div>

        {/* 町名 */}
        <div style={{ fontSize: 13 }}>{property.town ?? "—"}</div>

        {/* 金額・手数料 */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#c62828", marginBottom: 5 }}>
            {property.price != null ? `${property.price.toLocaleString()}万` : "—"}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              value={commission}
              onChange={e => {
                setCommission(e.target.value);
                onUpdate(property.id, { commission: e.target.value || null });
              }}
              style={{ padding: "3px 6px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, fontFamily: "inherit" }}
            >
              <option value="">手数料</option>
              {commissions.map(c => <option key={c.id} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={onShowAddCommission} title="手数料を追加"
              style={{ padding: "3px 7px", fontSize: 11, background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 4, cursor: "pointer" }}>
              +
            </button>
          </div>
        </div>

        {/* 備考 */}
        <div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => onUpdate(property.id, { note: note || null })}
            placeholder="備考"
            style={{ width: "100%", fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4, fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        {/* 担当・マイソク */}
        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 4, color: "#444" }}>{property.agent?.name ?? "未割当"}</div>
          {property.myosoku_url ? (
            <a href={property.myosoku_url} target="_blank" rel="noopener noreferrer"
              style={{ color: "#1565c0", fontSize: 11 }}>
              📄 {property.myosoku_filename ?? "マイソク"}
            </a>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 11, padding: "3px 8px", background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 4, cursor: "pointer" }}>
              + PDF
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUploadMyosoku(property.id, f); }} />
        </div>

        {/* アクションボタン */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            onClick={() => onConfirm(property.id)}
            style={{
              padding: "5px 10px", fontSize: 12, fontWeight: 600,
              background: property.confirmed_at ? "#e8f5e9" : "#ff7043",
              color: property.confirmed_at ? "#2e7d32" : "#fff",
              border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {property.confirmed_at
              ? `✅ 確認済 ${new Date(property.confirmed_at).toLocaleDateString("ja-JP")}`
              : "物件確認"}
          </button>
          {property.myosoku_url && (
            <a href={property.myosoku_url} target="_blank" rel="noopener noreferrer"
              style={{ padding: "5px 10px", fontSize: 12, background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 4, textDecoration: "none", color: "#1565c0", textAlign: "center" }}>
              PDF
            </a>
          )}
          {!isClosed && (
            <button
              onClick={() => {
                if (confirm(`${property.property_no} を未公開終了しますか？`)) {
                  onClose(property.id);
                }
              }}
              style={{ padding: "5px 10px", fontSize: 12, background: "#ef9a9a", color: "#c62828", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
            >
              未公開終了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── メインページ ───────────────────────────────────────────────────────────────

export default function PrivatePropertiesPage() {
  const [properties, setProperties] = useState<PrivateProperty[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ACTIVE");
  const [loading, setLoading] = useState(true);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [newCommissionLabel, setNewCommissionLabel] = useState("");
  const [addingCommission, setAddingCommission] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  // 手数料マスタ取得
  const fetchCommissions = useCallback(async () => {
    const res = await fetch("/api/commissions");
    const d = await res.json();
    setCommissions(d.commissions ?? []);
  }, []);

  // スタッフ一覧取得
  useEffect(() => {
    fetch("/api/staff").then(r => r.json()).then(d => {
      setStaffList((d.staff ?? []).map((s: Record<string, unknown>) => ({ id: s.id, name: s.name ?? s.full_name })));
    }).catch(() => {});
    fetchCommissions();
  }, [fetchCommissions]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/private-properties?filter=${filter}`);
      const d = await res.json();
      setProperties(d.properties ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/private-properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (res.ok && d.property) {
        setProperties(prev => prev.map(p => p.id === id ? d.property : p));
      }
    } catch { /* ignore */ }
  };

  const handleConfirm = async (id: string) => {
    const res = await fetch(`/api/private-properties/${id}/confirm`, { method: "POST" });
    const d = await res.json();
    if (res.ok && d.property) {
      setProperties(prev => prev.map(p => p.id === id ? d.property : p));
    }
  };

  const handleClose = async (id: string) => {
    const res = await fetch(`/api/private-properties/${id}/close`, { method: "POST" });
    const d = await res.json();
    if (res.ok) {
      if (filter === "ACTIVE") {
        setProperties(prev => prev.filter(p => p.id !== id));
      } else if (d.property) {
        setProperties(prev => prev.map(p => p.id === id ? d.property : p));
      }
    }
  };

  const handleUploadMyosoku = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/private-properties/${id}/myosoku`, { method: "POST", body: formData });
    const d = await res.json();
    if (res.ok && d.property) {
      setProperties(prev => prev.map(p => p.id === id ? d.property : p));
    }
  };

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/private-properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json();
    if (res.ok && d.property) {
      setProperties(prev => [d.property, ...prev]);
      setShowNewModal(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/private-properties/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      setImportResult(result);
      if (result.success) {
        await fetchProperties();
      }
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["通信エラーが発生しました"] });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleAddCommission = async () => {
    if (!newCommissionLabel.trim()) return;
    setAddingCommission(true);
    const res = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newCommissionLabel.trim() }),
    });
    if (res.ok) {
      await fetchCommissions();
      setNewCommissionLabel("");
      setShowAddCommission(false);
    }
    setAddingCommission(false);
  };

  const headerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "80px 170px 90px 110px 1fr 110px 160px 200px",
    background: "#ddd",
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    gap: 8,
    borderRadius: "6px 6px 0 0",
    marginTop: 16,
  };

  const btnBase: React.CSSProperties = {
    padding: "6px 14px", fontSize: 13, borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 20, background: "#f0f0f0", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1, margin: 0 }}>未公開物件DB</h1>
        <button onClick={() => setShowNewModal(true)}
          style={{ ...btnBase, background: "#fff", border: "1px solid #ccc", color: "#333" }}>
          新規作成
        </button>
        <button onClick={() => setFilter("ALL")}
          style={{ ...btnBase, background: filter === "ALL" ? "#f44336" : "#fff", color: filter === "ALL" ? "#fff" : "#333", border: "1px solid #ccc" }}>
          ALL
        </button>
        <button onClick={() => setFilter("ACTIVE")}
          style={{ ...btnBase, background: filter === "ACTIVE" ? "#1565c0" : "#fff", color: filter === "ACTIVE" ? "#fff" : "#333", border: "1px solid #ccc" }}>
          稼動中
        </button>
        <button onClick={() => setFilter("CLOSED")}
          style={{ ...btnBase, background: filter === "CLOSED" ? "#607d8b" : "#fff", color: filter === "CLOSED" ? "#fff" : "#333", border: "1px solid #ccc" }}>
          終了一覧
        </button>
        <button onClick={() => window.history.back()}
          style={{ ...btnBase, background: "#fff3e0", border: "1px solid #ffcc02", color: "#333" }}>
          閉じる
        </button>
      </div>

      {/* CSVインポート */}
      <div style={{ marginBottom: 12, padding: "12px 16px", background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>CSVインポート（Shift_JIS対応）</span>
        <label style={{
          padding: "5px 14px", fontSize: 12, background: importing ? "#999" : "#1565c0",
          color: "#fff", borderRadius: 5, cursor: importing ? "not-allowed" : "pointer",
          fontFamily: "inherit", fontWeight: 600,
        }}>
          {importing ? "インポート中..." : "CSVファイルを選択"}
          <input type="file" accept=".csv" onChange={handleCsvImport} disabled={importing}
            style={{ display: "none" }} />
        </label>
        {importResult && (
          <span style={{
            fontSize: 12,
            color: importResult.imported > 0 ? "#2e7d32" : "#c62828",
          }}>
            {importResult.imported > 0
              ? `✅ ${importResult.imported}件インポート完了（スキップ: ${importResult.skipped}件）`
              : `❌ エラー: ${importResult.errors?.[0] ?? "インポート失敗"}`}
          </span>
        )}
      </div>

      {/* サマリー */}
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
        {loading ? "読み込み中..." : `${properties.length}件`}
        {filter === "ACTIVE" && " （稼動中）"}
        {filter === "CLOSED" && " （終了済）"}
      </div>

      {/* テーブルヘッダー */}
      <div style={headerStyle}>
        <div>物件NO<br />登録日<br />更新日</div>
        <div>区分・物件種別</div>
        <div>区</div>
        <div>町名</div>
        <div>金額（万円）<br />手数料</div>
        <div>備考</div>
        <div>担当<br />マイソク</div>
        <div>アクション</div>
      </div>

      {/* 物件リスト */}
      {loading ? (
        <div style={{ background: "#fff", border: "1px solid #ddd", borderTop: "none", padding: "32px 16px", textAlign: "center", color: "#888", fontSize: 13 }}>
          読み込み中...
        </div>
      ) : properties.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #ddd", borderTop: "none", padding: "32px 16px", textAlign: "center", color: "#888", fontSize: 13 }}>
          データがありません。「新規作成」から追加してください。
        </div>
      ) : (
        properties.map(p => (
          <PropertyRow
            key={p.id}
            property={p}
            commissions={commissions}
            onUpdate={handleUpdate}
            onConfirm={handleConfirm}
            onClose={handleClose}
            onUploadMyosoku={handleUploadMyosoku}
            onShowAddCommission={() => setShowAddCommission(true)}
          />
        ))
      )}

      {/* 新規作成モーダル */}
      {showNewModal && (
        <NewModal
          commissions={commissions}
          staffList={staffList}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* 手数料追加モーダル */}
      {showAddCommission && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>手数料を追加</h3>
            <input
              value={newCommissionLabel}
              onChange={e => setNewCommissionLabel(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddCommission(); }}
              placeholder="例: 2%（税込）・要相談"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, marginBottom: 12, fontFamily: "inherit", boxSizing: "border-box", fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAddCommission(false); setNewCommissionLabel(""); }}
                style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                キャンセル
              </button>
              <button onClick={handleAddCommission} disabled={addingCommission}
                style={{ flex: 1, padding: 8, borderRadius: 6, background: "#1565c0", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
                {addingCommission ? "追加中..." : "追加する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
