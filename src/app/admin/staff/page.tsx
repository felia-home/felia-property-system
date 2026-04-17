"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PermissionBadge from "@/components/admin/PermissionBadge";
import { PERMISSIONS, Permission } from "@/lib/permissions";

interface StaffMember {
  id: string;
  name: string;
  name_kana: string | null;
  employee_number: string | null;
  permission: string;
  position: string | null;
  qualifications: string[];
  photo_url: string | null;
  email_work: string | null;
  tel_work: string | null;
  is_active: boolean;
  staff_code: string | null;
  show_on_recruit?: boolean;
  store: { id: string; name: string; store_code: string } | null;
  _count?: { properties_as_agent: number };
}

const PERMISSION_KEYS = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "BACKOFFICE", "SENIOR_AGENT", "AGENT"] as const;

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [permFilter, setPermFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"active" | "retired">("active");
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [codeGenResult, setCodeGenResult] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: session } = useSession();
  const [canDelete, setCanDelete] = useState(false);
  useEffect(() => {
    setCanDelete(["ADMIN", "SENIOR_MANAGER"].includes(session?.user?.permission ?? ""));
  }, [session]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (permFilter !== "all") params.set("permission", permFilter);
      if (storeFilter) params.set("store_id", storeFilter);
      params.set("active", activeFilter === "active" ? "true" : "false");
      params.set("includeStats", "true");
      if (search) params.set("search", search);
      const res = await fetch(`/api/staff?${params}`);
      const data = await res.json() as { staff?: StaffMember[] };
      setStaff(data.staff ?? []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then((d: { stores: { id: string; name: string }[] }) => setStores(d.stores ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [permFilter, storeFilter, activeFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/staff/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "削除に失敗しました");
        return;
      }
      setDeleteTarget(null);
      load();
    } catch {
      setDeleteError("通信エラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCsvImport = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/staff/import-csv", { method: "POST", body: fd });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      setImportResult(data);
      if (data.success) load();
    } catch {
      setImportResult({ message: "通信エラーが発生しました" });
    } finally {
      setImporting(false);
    }
  };

  const tabBtnSt = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? "#234f35" : "#f7f6f2",
    color: active ? "#fff" : "#706e68",
    border: "none", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1c1b18" }}>スタッフ管理</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={async () => {
              setGeneratingCodes(true);
              setCodeGenResult(null);
              try {
                const res = await fetch("/api/staff/generate-codes", { method: "POST" });
                const d = await res.json() as { generated?: number; total?: number; error?: string };
                if (res.ok) {
                  setCodeGenResult(`✅ ${d.generated}件生成（全${d.total}名）`);
                  load();
                } else {
                  setCodeGenResult(`❌ ${d.error ?? "エラー"}`);
                }
              } catch {
                setCodeGenResult("❌ 通信エラー");
              } finally {
                setGeneratingCodes(false);
              }
            }}
            disabled={generatingCodes}
            style={{ background: "#333", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: generatingCodes ? 0.6 : 1 }}>
            {generatingCodes ? "生成中..." : "🔧 コード一括生成"}
          </button>
          <button onClick={() => { setShowImportModal(true); setImportResult(null); }}
            style={{ background: "#1565c0", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            📥 CSVインポート
          </button>
          <Link href="/admin/staff/new" style={{
            background: "#8c1f1f", color: "#fff", padding: "8px 20px",
            borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            + スタッフ追加
          </Link>
        </div>
      </div>

      {/* Code gen result toast */}
      {codeGenResult && (
        <div style={{
          background: codeGenResult.startsWith("✅") ? "#e8f5e9" : "#fdeaea",
          border: `1px solid ${codeGenResult.startsWith("✅") ? "#a5d6a7" : "#ffcdd2"}`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 12,
          fontSize: 13, color: codeGenResult.startsWith("✅") ? "#2e7d32" : "#c62828",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {codeGenResult}
          <button onClick={() => setCodeGenResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa", fontFamily: "inherit" }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "16px 20px", marginBottom: 20 }}>
        {/* Permission tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button style={tabBtnSt(permFilter === "all")} onClick={() => setPermFilter("all")}>全員</button>
          {PERMISSION_KEYS.map(p => (
            <button key={p} style={tabBtnSt(permFilter === p)} onClick={() => setPermFilter(p)}>
              {PERMISSIONS[p].label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Store filter */}
          <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
            style={{ padding: "7px 11px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
            <option value="">全店舗</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Active/Retired toggle */}
          <div style={{ display: "flex", gap: 0, border: "1px solid #e0deda", borderRadius: 7, overflow: "hidden" }}>
            {(["active", "retired"] as const).map(v => (
              <button key={v} onClick={() => setActiveFilter(v)}
                style={{ padding: "7px 14px", fontSize: 12, border: "none", background: activeFilter === v ? "#234f35" : "#fff", color: activeFilter === v ? "#fff" : "#706e68", cursor: "pointer", fontFamily: "inherit" }}>
                {v === "active" ? "在籍中" : "退職済み"}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・社員番号で検索..."
            style={{ padding: "7px 12px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 13, fontFamily: "inherit", width: 220 }}
          />

          <span style={{ fontSize: 12, color: "#888", marginLeft: "auto" }}>{staff.length}名</span>
        </div>
      </div>

      {/* Staff grid */}
      {loading ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 48 }}>読み込み中...</div>
      ) : staff.length === 0 ? (
        <div style={{ color: "#aaa", textAlign: "center", padding: 48 }}>スタッフが見つかりません</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {staff.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Photo */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f7f6f2", overflow: "hidden", marginBottom: 4, flexShrink: 0 }}>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ccc" }}>👤</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1b18" }}>{s.name}</div>
                {s.name_kana && <div style={{ fontSize: 11, color: "#888" }}>{s.name_kana}</div>}
              </div>

              <div style={{ fontSize: 12, color: "#706e68" }}>{s.store?.name ?? "—"}</div>

              {s.position && <div style={{ fontSize: 12, color: "#706e68" }}>{s.position}</div>}

              <PermissionBadge permission={s.permission} />

              {(s.qualifications ?? []).length > 0 && (
                <div style={{ fontSize: 11, color: "#706e68" }}>{(s.qualifications ?? []).slice(0, 2).join("・")}{(s.qualifications ?? []).length > 2 ? `他${(s.qualifications ?? []).length - 2}件` : ""}</div>
              )}

              {/* Staff code badge */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <div style={{
                  fontSize: 11, fontFamily: "monospace",
                  background: s.staff_code ? "#f0f7f3" : "#fafaf8",
                  color: s.staff_code ? "#234f35" : "#aaa",
                  border: `1px solid ${s.staff_code ? "#c3e6cb" : "#e0deda"}`,
                  borderRadius: 6, padding: "3px 8px", display: "inline-block",
                }}>
                  {s.staff_code ? `📋 ${s.staff_code}` : "コード未設定"}
                </div>
                {s.show_on_recruit && (
                  <span style={{
                    fontSize: 10, background: "#dcfce7", color: "#166534",
                    padding: "2px 6px", borderRadius: 10, fontWeight: "bold",
                    border: "1px solid #bbf7d0",
                  }}>
                    採用
                  </span>
                )}
              </div>

              {s._count && (
                <div style={{ fontSize: 12, color: "#888" }}>担当物件: <strong style={{ color: "#1c1b18" }}>{s._count.properties_as_agent}</strong>件</div>
              )}

              <div style={{ marginTop: "auto", display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid #f2f1ed" }}>
                <Link href={`/admin/staff/${s.id}`}
                  style={{ flex: 1, fontSize: 12, color: "#8c1f1f", textDecoration: "none", fontWeight: 600 }}>
                  詳細を見る →
                </Link>
                {canDelete && (
                  <button
                    onClick={() => { setDeleteTarget(s); setDeleteError(null); }}
                    style={{ fontSize: 11, color: "#c0392b", background: "#fff5f5", border: "1px solid #fce4e4", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 420, position: "relative" }}>
            <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#706e68", lineHeight: 1 }}>×</button>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#1c1b18" }}>スタッフを削除しますか？</h2>
            <p style={{ fontSize: 13, color: "#706e68", marginBottom: 4 }}>
              <strong>{deleteTarget.name}</strong> を退職済みにします。
            </p>
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
              この操作は論理削除です（データは保持されます）。担当物件がある場合は削除できません。
            </p>
            {deleteError && (
              <div style={{ background: "#fdeaea", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#c62828" }}>
                ❌ {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                キャンセル
              </button>
              <button onClick={handleDeleteStaff} disabled={isDeleting}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", opacity: isDeleting ? 0.6 : 1 }}>
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 480, position: "relative" }}>
            <button onClick={() => { setShowImportModal(false); setImportResult(null); }}
              style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#706e68", lineHeight: 1 }}>×</button>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>📥 スタッフCSVインポート</h2>
            <p style={{ fontSize: 12, color: "#706e68", marginBottom: 20 }}>
              jinjer（ジンジャー）の社員台帳CSVをアップロードしてスタッフを一括登録します。<br />
              社員番号またはメールアドレスで照合し、既存スタッフは更新します。
            </p>

            {!importing && (
              <div
                onClick={() => csvInputRef.current?.click()}
                style={{ border: "2px dashed #c8c6c0", borderRadius: 12, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "#fafaf8" }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, color: "#706e68" }}>クリックしてCSVファイルを選択</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>jinjer_社員台帳_簡易版_*.csv（Shift_JIS対応）</div>
              </div>
            )}

            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={e => handleCsvImport(e.target.files?.[0])} />

            {importing && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#706e68" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 13 }}>インポート中...</div>
              </div>
            )}

            {importResult && (
              <div style={{
                marginTop: 16, padding: "12px 14px", borderRadius: 8, fontSize: 13,
                background: importResult.success ? "#e8f5e9" : "#fdeaea",
                color: importResult.success ? "#2e7d32" : "#8c1f1f",
              }}>
                {importResult.success ? "✅ " : "❌ "}{importResult.message ?? importResult.error}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }}
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e0deda", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
