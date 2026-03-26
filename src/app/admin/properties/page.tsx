export default function PropertiesPage() {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>物件一覧</h1>
          <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>登録物件の管理・掲載設定</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/properties/import" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#fff", border: "1px solid #e0deda", color: "#1c1b18", cursor: "pointer",
          }}>PDF取込</a>
          <a href="/admin/properties/new" style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#234f35", color: "#fff", cursor: "pointer",
          }}>+ 新規登録</a>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", display: "flex", gap: 8 }}>
          <input placeholder="物件名・住所で検索" style={{
            padding: "6px 12px", border: "1px solid #e0deda", borderRadius: 7,
            fontSize: 12, width: 200, fontFamily: "inherit",
          }} />
          <select style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option>全ステータス</option>
            <option>承認待ち</option>
            <option>掲載中</option>
            <option>成約アラート</option>
          </select>
          <select style={{ padding: "6px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
            <option>全店舗</option>
            <option>自由が丘店</option>
            <option>中目黒店</option>
            <option>渋谷店</option>
          </select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f6f2" }}>
              {["物件名", "担当店舗", "ステータス", "価格", "掲載日数", "操作"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 500,
                  color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase",
                  padding: "10px 16px", borderBottom: "1px solid #e0deda",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#706e68", fontSize: 13 }}>
                物件データがありません。CSVインポートまたは新規登録から追加してください。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
