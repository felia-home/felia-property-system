"use client";
import { useEffect, useState } from "react";

interface Company {
  id: string;
  name: string;
  license_number: string | null;
  license_expiry: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  representative: string | null;
  stores: { id: string; name: string; store_code: string }[];
}
interface StoreForm { company_id: string; name: string; store_code: string; address: string; phone: string }

const inputSt: React.CSSProperties = {
  border: "1px solid #e0deda", borderRadius: 7, padding: "8px 11px",
  fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5a4a3a", marginBottom: 4, display: "block" };
const rowSt: React.CSSProperties = { display: "flex", flexDirection: "column" };
const cardSt: React.CSSProperties = { background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20 };

export default function SettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyForm, setCompanyForm] = useState({
    name: "", license_number: "", license_expiry: "",
    postal_code: "", address: "", phone: "", representative: "",
  });
  const [storeForm, setStoreForm] = useState<StoreForm>({ company_id: "", name: "", store_code: "", address: "", phone: "" });
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"company" | "gmail">("company");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/companies");
    const d = await res.json() as { companies: Company[] };
    setCompanies(d.companies ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name) return;
    setSavingCompany(true);
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(companyForm),
    });
    await load();
    setCompanyForm({ name: "", license_number: "", license_expiry: "", postal_code: "", address: "", phone: "", representative: "" });
    notify("会社を登録しました");
    setSavingCompany(false);
  };

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.company_id || !storeForm.name || !storeForm.store_code) return;
    setSavingStore(true);
    await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storeForm),
    });
    await load();
    setStoreForm({ company_id: "", name: "", store_code: "", address: "", phone: "" });
    notify("店舗を登録しました");
    setSavingStore(false);
  };

  // License expiry warning
  const today = new Date();
  const expiryWarnings = companies.flatMap(c =>
    c.license_expiry
      ? [{
          company: c.name,
          expiry: new Date(c.license_expiry),
          daysLeft: Math.ceil((new Date(c.license_expiry).getTime() - today.getTime()) / 86400000),
        }]
      : []
  ).filter(w => w.daysLeft <= 90);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a", marginBottom: 24 }}>設定</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #e0deda" }}>
        {([["company", "会社・店舗設定"], ["gmail", "Gmail連携"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "8px 20px", border: "none", borderBottom: activeTab === tab ? "2px solid #8c1f1f" : "2px solid transparent", background: "none", fontSize: 14, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? "#8c1f1f" : "#706e68", cursor: "pointer", fontFamily: "inherit", marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {msg && <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {activeTab === "gmail" && (
        <div style={cardSt}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#3a2a1a", marginBottom: 16 }}>Gmail連携設定</div>
          <div style={{ fontSize: 13, color: "#5a4a3a", marginBottom: 16, lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 12px" }}>ポータルサイト（SUUMO、athome等）からの反響メールをGmailから自動取込します。</p>
            <div style={{ background: "#f8f6f3", borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>設定手順</div>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Google Cloud ConsoleでOAuth 2.0クライアントIDを作成</li>
                <li>リダイレクトURIに <code style={{ background: "#e8e4e0", padding: "1px 6px", borderRadius: 4 }}>https://admin.felia-home.co.jp/api/gmail/callback</code> を追加</li>
                <li><code style={{ background: "#e8e4e0", padding: "1px 6px", borderRadius: 4 }}>GMAIL_CLIENT_ID</code> と <code style={{ background: "#e8e4e0", padding: "1px 6px", borderRadius: 4 }}>GMAIL_CLIENT_SECRET</code> を .env に設定</li>
                <li>下の「Gmailで認証する」ボタンをクリックして認証</li>
                <li>表示される <code style={{ background: "#e8e4e0", padding: "1px 6px", borderRadius: 4 }}>GMAIL_REFRESH_TOKEN</code> を .env に設定</li>
              </ol>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>現在の状態: </span>
              {process.env.NEXT_PUBLIC_GMAIL_CONFIGURED === "true" ? (
                <span style={{ color: "#2e7d32", fontWeight: 600 }}>接続済み</span>
              ) : (
                <span style={{ color: "#c62828", fontWeight: 600 }}>未接続（.envにGMAIL_CLIENT_IDを設定してください）</span>
              )}
            </div>
          </div>
          <a href="/api/gmail/auth"
            style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: "#1565c0", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Gmailで認証する
          </a>
        </div>
      )}

      {activeTab === "company" && expiryWarnings.length > 0 && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", padding: "12px 16px", borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: "#f57f17", fontSize: 13, marginBottom: 6 }}>⚠ 宅建業免許 期限アラート</div>
          {expiryWarnings.map(w => (
            <div key={w.company} style={{ fontSize: 13, color: "#5a4a3a" }}>
              {w.company}：{w.expiry.toLocaleDateString("ja-JP")} まで（残り <strong style={{ color: w.daysLeft <= 30 ? "#c62828" : "#e65100" }}>{w.daysLeft}日</strong>）
            </div>
          ))}
        </div>
      )}

      {/* Existing companies */}
      {activeTab === "company" && (
        loading ? (
          <div style={{ color: "#aaa", padding: 20 }}>読み込み中...</div>
        ) : companies.map(c => (
          <div key={c.id} style={cardSt}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#3a2a1a" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {c.license_number && <span style={{ marginRight: 12 }}>免許: {c.license_number}</span>}
                  {c.license_expiry && <span style={{ marginRight: 12 }}>有効期限: {new Date(c.license_expiry).toLocaleDateString("ja-JP")}</span>}
                  {c.phone && <span>TEL: {c.phone}</span>}
                </div>
                {c.address && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{c.address}</div>}
              </div>
            </div>
            {c.stores.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8 }}>店舗一覧</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {c.stores.map(s => (
                    <div key={s.id} style={{ background: "#f8f6f3", padding: "6px 14px", borderRadius: 20, fontSize: 12, color: "#3a2a1a" }}>
                      <strong>{s.store_code}</strong> {s.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add company */}
      {activeTab === "company" && <div style={cardSt}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#3a2a1a", marginBottom: 16 }}>会社を登録</div>
        <form onSubmit={saveCompany} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={rowSt}>
              <label style={labelSt}>会社名 <span style={{ color: "#8c1f1f" }}>*</span></label>
              <input style={inputSt} value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} required placeholder="フェリアホーム株式会社" />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>代表者名</label>
              <input style={inputSt} value={companyForm.representative} onChange={e => setCompanyForm(f => ({ ...f, representative: e.target.value }))} placeholder="田中 一郎" />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>宅建業免許番号</label>
              <input style={inputSt} value={companyForm.license_number} onChange={e => setCompanyForm(f => ({ ...f, license_number: e.target.value }))} placeholder="東京都知事(3)第12345号" />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>免許有効期限</label>
              <input style={inputSt} type="date" value={companyForm.license_expiry} onChange={e => setCompanyForm(f => ({ ...f, license_expiry: e.target.value }))} />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>電話番号</label>
              <input style={inputSt} value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} placeholder="03-0000-0000" />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>住所</label>
              <input style={inputSt} value={companyForm.address} onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} placeholder="東京都渋谷区..." />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={savingCompany}
              style={{ padding: "9px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: savingCompany ? "not-allowed" : "pointer", opacity: savingCompany ? 0.7 : 1 }}>
              {savingCompany ? "登録中..." : "会社を登録"}
            </button>
          </div>
        </form>
      </div>}

      {/* Add store */}
      {activeTab === "company" && <div style={cardSt}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#3a2a1a", marginBottom: 16 }}>店舗を追加</div>
        <form onSubmit={saveStore} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={rowSt}>
              <label style={labelSt}>会社 <span style={{ color: "#8c1f1f" }}>*</span></label>
              <select style={inputSt} value={storeForm.company_id} onChange={e => setStoreForm(f => ({ ...f, company_id: e.target.value }))} required>
                <option value="">選択してください</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={rowSt}>
              <label style={labelSt}>店舗名 <span style={{ color: "#8c1f1f" }}>*</span></label>
              <input style={inputSt} value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} required placeholder="渋谷店" />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>店舗コード <span style={{ color: "#8c1f1f" }}>*</span></label>
              <input style={inputSt} value={storeForm.store_code} onChange={e => setStoreForm(f => ({ ...f, store_code: e.target.value.toUpperCase() }))} required placeholder="SHB" maxLength={8} />
            </div>
            <div style={rowSt}>
              <label style={labelSt}>電話</label>
              <input style={inputSt} value={storeForm.phone} onChange={e => setStoreForm(f => ({ ...f, phone: e.target.value }))} placeholder="03-0000-0000" />
            </div>
            <div style={{ ...rowSt, gridColumn: "span 2" }}>
              <label style={labelSt}>住所</label>
              <input style={inputSt} value={storeForm.address} onChange={e => setStoreForm(f => ({ ...f, address: e.target.value }))} placeholder="東京都渋谷区..." />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={savingStore}
              style={{ padding: "9px 24px", borderRadius: 8, background: "#8c1f1f", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: savingStore ? "not-allowed" : "pointer", opacity: savingStore ? 0.7 : 1 }}>
              {savingStore ? "追加中..." : "店舗を追加"}
            </button>
          </div>
        </form>
      </div>}
    </div>
  );
}
