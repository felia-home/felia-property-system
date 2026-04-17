"use client";
import { useState, useEffect, useRef } from "react";

interface HpSection {
  id: string;
  section_key: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
  heading: string | null;
  subheading: string | null;
}

export default function HpSectionsPage() {
  const [sections, setSections] = useState<HpSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/hp-sections")
      .then(r => r.json())
      .then((d: { sections?: HpSection[] }) => {
        setSections(d.sections ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newSections = [...sections];
    const dragged = newSections.splice(dragItem.current, 1)[0];
    newSections.splice(dragOverItem.current, 0, dragged);
    const reordered = newSections.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setSections(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleVisibility = (id: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, is_visible: !s.is_visible } : s
    ));
  };

  const updateText = (id: string, field: "heading" | "subheading", value: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value || null } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hp-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert("保存に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#706e68", fontSize: 13 }}>読み込み中...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>HPセクション管理</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            ドラッグ＆ドロップで順序変更・表示/非表示の切り替え・見出し編集ができます
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 24px",
            backgroundColor: saved ? "#5BAD52" : saving ? "#9ca3af" : "#5BAD52",
            color: "#fff", border: "none", borderRadius: 8,
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
          }}
        >
          {saved ? "✅ 保存しました" : saving ? "保存中..." : "💾 保存する"}
        </button>
      </div>

      {/* 注意書き */}
      <div style={{
        padding: "12px 16px", backgroundColor: "#eff6ff",
        border: "1px solid #bfdbfe", borderRadius: 8,
        marginBottom: 20, fontSize: 13, color: "#1d4ed8",
      }}>
        💡 変更を保存後、HPに反映されます。非表示にしたセクションはHPに表示されません。
      </div>

      {/* セクション一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={e => e.preventDefault()}
            style={{
              border: `2px solid ${section.is_visible ? "#e5e7eb" : "#f3f4f6"}`,
              borderRadius: 8,
              backgroundColor: section.is_visible ? "#fff" : "#f9fafb",
              opacity: section.is_visible ? 1 : 0.6,
              cursor: "grab",
              transition: "all 0.15s",
            }}
          >
            {/* メイン行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              {/* ドラッグハンドル */}
              <span style={{ fontSize: 18, color: "#9ca3af", cursor: "grab", userSelect: "none" }}>⠿</span>

              {/* 順序番号 */}
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: section.is_visible ? "#5BAD52" : "#e5e7eb",
                color: section.is_visible ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {index + 1}
              </span>

              {/* セクション名 */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: section.is_visible ? "#111" : "#9ca3af", margin: "0 0 2px" }}>
                  {section.label}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{section.section_key}</p>
              </div>

              {/* 編集ボタン */}
              <button
                onClick={e => { e.stopPropagation(); setEditingId(editingId === section.id ? null : section.id); }}
                style={{
                  padding: "5px 12px", fontSize: 12,
                  backgroundColor: editingId === section.id ? "#f3f4f6" : "#fff",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  cursor: "pointer", color: "#374151", fontFamily: "inherit",
                }}
              >
                {editingId === section.id ? "▲ 閉じる" : "✏️ 編集"}
              </button>

              {/* 表示/非表示トグル */}
              <button
                onClick={e => { e.stopPropagation(); toggleVisibility(section.id); }}
                style={{
                  padding: "6px 16px", fontSize: 13, fontWeight: 600,
                  backgroundColor: section.is_visible ? "#dcfce7" : "#f3f4f6",
                  color: section.is_visible ? "#15803d" : "#9ca3af",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  whiteSpace: "nowrap", fontFamily: "inherit",
                }}
              >
                {section.is_visible ? "👁 表示中" : "🚫 非表示"}
              </button>
            </div>

            {/* 編集パネル */}
            {editingId === section.id && (
              <div style={{ borderTop: "1px solid #e5e7eb", padding: 16, backgroundColor: "#f9fafb" }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                    見出しテキスト（省略可）
                  </label>
                  <input
                    value={section.heading ?? ""}
                    onChange={e => updateText(section.id, "heading", e.target.value)}
                    placeholder="例：PICK UP PROPERTY"
                    style={{
                      width: "100%", padding: "8px 12px",
                      border: "1px solid #d1d5db", borderRadius: 6,
                      fontSize: 14, boxSizing: "border-box",
                      backgroundColor: "#fff", fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                    サブ見出しテキスト（省略可）
                  </label>
                  <input
                    value={section.subheading ?? ""}
                    onChange={e => updateText(section.id, "subheading", e.target.value)}
                    placeholder="例：フェリアホームがセレクトした厳選物件"
                    style={{
                      width: "100%", padding: "8px 12px",
                      border: "1px solid #d1d5db", borderRadius: 6,
                      fontSize: 14, boxSizing: "border-box",
                      backgroundColor: "#fff", fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 下部保存ボタン */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 48px",
            backgroundColor: saved ? "#5BAD52" : saving ? "#9ca3af" : "#111",
            color: "#fff", border: "none", borderRadius: 8,
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 15, fontWeight: 700, fontFamily: "inherit",
          }}
        >
          {saved ? "✅ 保存しました" : saving ? "保存中..." : "💾 変更を保存する"}
        </button>
      </div>
    </div>
  );
}
