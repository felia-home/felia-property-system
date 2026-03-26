export default function DashboardPage() {
  const kpis = [
    { label: "掲載中物件", value: "0", unit: "件", color: "#234f35" },
    { label: "広告確認待ち", value: "0", unit: "件", color: "#8a5200" },
    { label: "成約アラート", value: "0", unit: "件", color: "#8c1f1f" },
    { label: "今月の成約", value: "0", unit: "件", color: "#1a3f6e" },
  ];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>ダッシュボード</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>フェリアホーム 物件管理システム</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: "#fff", borderRadius: 12,
            border: "1px solid #e0deda", padding: "18px 20px",
            borderLeft: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 10, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>
              {k.value}<span style={{ fontSize: 13, fontWeight: 400, color: "#706e68", marginLeft: 3 }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>システム状態</h2>
        <p style={{ fontSize: 13, color: "#706e68" }}>✅ データベース接続: 正常</p>
        <p style={{ fontSize: 13, color: "#706e68", marginTop: 8 }}>✅ admin.felia-home.co.jp: 稼働中</p>
        <p style={{ fontSize: 13, color: "#706e68", marginTop: 8 }}>⚙️ 物件データ: CSVインポート待ち</p>
      </div>
    </div>
  );
}
