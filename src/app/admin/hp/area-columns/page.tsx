"use client";
import { useState, useEffect } from "react";
import { TOKYO_TRAIN_LINES, TOKYO_LINE_KEYS } from "@/lib/tokyoStations";

interface Station {
  id: string;
  station_line: string;
  station_name: string;
  area: string | null;
}

interface AreaColumn {
  id: string;
  area: string;
  title: string;
  content: string | null;
  image_url: string | null;
  is_active: boolean;
  published_at: string | null;
  stations: { station: Station }[];
}

export default function AreaColumnsPage() {
  const [columns, setColumns]   = useState<AreaColumn[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading]   = useState(false);

  // 新規コラム用state
  const [showForm, setShowForm]             = useState(false);
  const [editId, setEditId]                 = useState<string | null>(null);
  const [formTitle, setFormTitle]           = useState("");
  const [formArea, setFormArea]             = useState("");
  const [formContent, setFormContent]       = useState("");
  const [formStationIds, setFormStationIds] = useState<string[]>([]);
  const [formPublished, setFormPublished]   = useState("");
  const [aiGenerating, setAiGenerating]     = useState(false);

  // 駅登録用state
  const [showStationForm, setShowStationForm] = useState(false);
  const [newLine, setNewLine]       = useState("");
  const [newStation, setNewStation] = useState("");
  const [newArea, setNewArea]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [colRes, staRes] = await Promise.all([
        fetch("/api/admin/area-columns"),
        fetch("/api/admin/column-stations"),
      ]);
      const colData = await colRes.json();
      const staData = await staRes.json();
      setColumns(colData.columns ?? []);
      setStations(staData.stations ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleAiGenerate = async () => {
    if (!formTitle && !formArea) {
      alert("タイトルまたはエリア名を入力してください");
      return;
    }
    setAiGenerating(true);
    try {
      const selectedStations = stations
        .filter(s => formStationIds.includes(s.id))
        .map(s => `${s.station_line} ${s.station_name}駅`);

      const prompt = `不動産会社のエリアコラムを書いてください。

エリア: ${formArea || "エリア未指定"}
タイトル: ${formTitle || "エリアコラム"}
対象駅: ${selectedStations.join("、") || "未指定"}

以下の形式で800〜1200文字程度のコラム記事を書いてください：
- 街の特徴・雰囲気
- 交通アクセス
- 生活環境（スーパー・病院・公園等）
- 子育て環境
- 住みやすさのポイント

読者は物件購入を検討している一般消費者です。
親しみやすい文体で、具体的な情報を含めて書いてください。
HTMLタグは使わず、段落で区切ってください。`;

      const res = await fetch("/api/anthropic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        alert("AI生成に失敗しました");
        return;
      }
      const data = await res.json();
      setFormContent(data.content ?? "");
    } catch {
      alert("AI生成に失敗しました");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      alert("タイトルを入力してください");
      return;
    }
    const body = {
      area:         formArea,
      title:        formTitle,
      content:      formContent,
      station_ids:  formStationIds,
      published_at: formPublished || null,
      is_active:    true,
    };

    if (editId) {
      await fetch(`/api/admin/area-columns/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/area-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    resetForm();
    await load();
  };

  const handleEdit = (col: AreaColumn) => {
    setEditId(col.id);
    setFormTitle(col.title);
    setFormArea(col.area);
    setFormContent(col.content ?? "");
    setFormStationIds(col.stations.map(s => s.station.id));
    setFormPublished(col.published_at ? col.published_at.slice(0, 10) : "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このコラムを削除しますか？")) return;
    await fetch(`/api/admin/area-columns/${id}`, { method: "DELETE" });
    await load();
  };

  const handleAddStation = async () => {
    if (!newLine || !newStation) return;
    await fetch("/api/admin/column-stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ station_line: newLine, station_name: newStation, area: newArea }),
    });
    setNewLine(""); setNewStation(""); setNewArea("");
    await load();
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm("この駅を削除しますか？")) return;
    await fetch(`/api/admin/column-stations?id=${id}`, { method: "DELETE" });
    await load();
  };

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setFormTitle(""); setFormArea(""); setFormContent("");
    setFormStationIds([]); setFormPublished("");
  };

  const toggleStation = (id: string) => {
    setFormStationIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const stationsByLine = stations.reduce<Record<string, Station[]>>((acc, s) => {
    if (!acc[s.station_line]) acc[s.station_line] = [];
    acc[s.station_line].push(s);
    return acc;
  }, {});

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>📝 エリアコラム</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            駅別のエリア紹介コラムをAIで作成・管理します
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowStationForm(v => !v)}
            style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 13,
              border: "1px solid #d1d5db", background: "#fff",
              cursor: "pointer", fontWeight: "bold", fontFamily: "inherit",
            }}
          >
            🚉 駅を管理
          </button>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 13,
              border: "none", background: "#5BAD52",
              color: "#fff", cursor: "pointer", fontWeight: "bold", fontFamily: "inherit",
            }}
          >
            ＋ コラムを作成
          </button>
        </div>
      </div>

      {/* 駅管理パネル */}
      {showStationForm && (
        <div style={{
          marginBottom: 20, padding: 20,
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>🚉 駅マスタ管理</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={newLine}
              onChange={e => { setNewLine(e.target.value); setNewStation(""); }}
              style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 220, fontFamily: "inherit", background: "#fff" }}
            >
              <option value="">路線を選択</option>
              {TOKYO_LINE_KEYS.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
            <select
              value={newStation}
              onChange={e => setNewStation(e.target.value)}
              disabled={!newLine}
              style={{
                padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6,
                fontSize: 13, width: 180, fontFamily: "inherit",
                background: newLine ? "#fff" : "#f3f4f6",
                cursor: newLine ? "pointer" : "not-allowed",
              }}
            >
              <option value="">駅を選択</option>
              {newLine && (TOKYO_TRAIN_LINES[newLine] ?? []).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              value={newArea} onChange={e => setNewArea(e.target.value)}
              placeholder="エリア（例: 新宿区）"
              style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 120, fontFamily: "inherit" }}
            />
            <button
              type="button" onClick={handleAddStation}
              disabled={!newLine || !newStation}
              style={{
                padding: "7px 16px", borderRadius: 6, border: "none",
                background: !newLine || !newStation ? "#e5e7eb" : "#5BAD52",
                color: !newLine || !newStation ? "#9ca3af" : "#fff",
                fontSize: 13,
                cursor: !newLine || !newStation ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontWeight: "bold",
              }}
            >
              追加
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {Object.entries(stationsByLine).map(([line, sts]) => (
              <div key={line} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>{line}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {sts.map(s => (
                    <span key={s.id} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", background: "#fff",
                      border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 12,
                    }}>
                      {s.station_name}
                      {s.area && <span style={{ color: "#9ca3af" }}>({s.area})</span>}
                      <button
                        type="button" onClick={() => handleDeleteStation(s.id)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "inherit" }}
                      >✕</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {stations.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>駅が登録されていません</div>
            )}
          </div>
        </div>
      )}

      {/* コラム作成・編集フォーム */}
      {showForm && (
        <div style={{
          marginBottom: 20, padding: 24,
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16 }}>
            {editId ? "コラムを編集" : "コラムを新規作成"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                エリア名
              </label>
              <input
                value={formArea} onChange={e => setFormArea(e.target.value)}
                placeholder="例: 新宿区"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
                公開日
              </label>
              <input
                type="date" value={formPublished} onChange={e => setFormPublished(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 4 }}>
              タイトル
            </label>
            <input
              value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder="例: 四谷三丁目駅周辺の住みやすさ"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: "bold", color: "#6b7280", marginBottom: 6 }}>
              対象駅（複数選択可）
            </label>
            {stations.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>先に駅を登録してください</div>
            ) : (
              <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}>
                {Object.entries(stationsByLine).map(([line, sts]) => (
                  <div key={line} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{line}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {sts.map(s => (
                        <label key={s.id} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 12, fontSize: 12, cursor: "pointer",
                          background: formStationIds.includes(s.id) ? "#dcfce7" : "#f9fafb",
                          border: `1px solid ${formStationIds.includes(s.id) ? "#86efac" : "#e5e7eb"}`,
                          fontWeight: formStationIds.includes(s.id) ? "bold" : "normal",
                        }}>
                          <input
                            type="checkbox"
                            checked={formStationIds.includes(s.id)}
                            onChange={() => toggleStation(s.id)}
                            style={{ display: "none" }}
                          />
                          {s.station_name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: "bold", color: "#6b7280" }}>
                コラム本文
              </label>
              <button
                type="button" onClick={handleAiGenerate} disabled={aiGenerating}
                style={{
                  padding: "5px 14px", borderRadius: 6, fontSize: 12,
                  border: "1px solid #fde68a",
                  background: aiGenerating ? "#e5e7eb" : "#fffbeb",
                  color: aiGenerating ? "#9ca3af" : "#92400e",
                  fontWeight: "bold",
                  cursor: aiGenerating ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {aiGenerating ? "✨ AI生成中..." : "✨ AIで本文を生成"}
              </button>
            </div>
            <textarea
              value={formContent} onChange={e => setFormContent(e.target.value)}
              rows={12}
              placeholder="コラム本文を入力するか、「AIで本文を生成」ボタンを押してください"
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid #d1d5db", borderRadius: 6,
                fontSize: 13, lineHeight: 1.7, resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={resetForm}
              style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              キャンセル
            </button>
            <button type="button" onClick={handleSave}
              style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#5BAD52", color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
              保存
            </button>
          </div>
        </div>
      )}

      {/* コラム一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>読み込み中...</div>
      ) : columns.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60,
          border: "2px dashed #e5e7eb", borderRadius: 8, color: "#9ca3af",
        }}>
          コラムが登録されていません。「＋ コラムを作成」から追加してください。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {columns.map(col => (
            <div key={col.id} style={{
              padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    {col.area && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 8,
                        background: "#eff6ff", color: "#1d4ed8", fontWeight: "bold",
                      }}>
                        {col.area}
                      </span>
                    )}
                    {col.stations.map(({ station }) => (
                      <span key={station.id} style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 8,
                        background: "#f0fdf4", color: "#166534",
                      }}>
                        🚉 {station.station_name}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {col.published_at ? col.published_at.slice(0, 10) : "未公開"}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: "bold", color: "#374151", marginBottom: 4 }}>
                    {col.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: "#6b7280", lineHeight: 1.6,
                    overflow: "hidden", maxHeight: 48,
                  }}>
                    {col.content ?? "本文なし"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 16 }}>
                  <button type="button" onClick={() => handleEdit(col)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    編集
                  </button>
                  <button type="button" onClick={() => handleDelete(col.id)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
