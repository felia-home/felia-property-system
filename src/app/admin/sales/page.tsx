"use client";
import { useEffect, useState } from "react";
import { calcCommission } from "@/lib/commission";

interface ContractItem {
  id: string;
  contract_price: number;
  commission_type: string;
  commission_amount: number | null;
  status: string;
  agent_id: string | null;
  contract_date: string | null;
  property: { city: string; address: string; property_type: string } | null;
}

interface MonthlyData {
  month: string;
  contracts: number;
  revenue: number;
}

interface AgentData {
  agent_id: string;
  contracts: number;
  revenue: number;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築戸建", USED_HOUSE: "中古戸建", MANSION: "マンション",
  NEW_MANSION: "新築マンション", LAND: "土地",
};

function groupByMonth(contracts: ContractItem[]): MonthlyData[] {
  const map: Record<string, { contracts: number; revenue: number }> = {};
  contracts.forEach((c) => {
    if (!c.contract_date) return;
    const d = new Date(c.contract_date);
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!map[key]) map[key] = { contracts: 0, revenue: 0 };
    map[key].contracts++;
    map[key].revenue += c.commission_amount ?? calcCommission(c.contract_price, c.commission_type as "buyer" | "seller" | "both");
  });
  return Object.entries(map)
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);
}

function groupByAgent(contracts: ContractItem[]): AgentData[] {
  const map: Record<string, { contracts: number; revenue: number }> = {};
  contracts.forEach((c) => {
    const key = c.agent_id ?? "未設定";
    if (!map[key]) map[key] = { contracts: 0, revenue: 0 };
    map[key].contracts++;
    map[key].revenue += c.commission_amount ?? calcCommission(c.contract_price, c.commission_type as "buyer" | "seller" | "both");
  });
  return Object.entries(map)
    .map(([agent_id, v]) => ({ agent_id, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

function thisMonthContracts(contracts: ContractItem[]): ContractItem[] {
  const now = new Date();
  return contracts.filter((c) => {
    if (!c.contract_date) return false;
    const d = new Date(c.contract_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export default function SalesPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcPrice, setCalcPrice] = useState("");
  const [calcType, setCalcType] = useState<"both" | "buyer" | "seller">("both");

  useEffect(() => {
    fetch("/api/contracts?status=completed")
      .then((r) => r.json())
      .then((d) => setContracts(d.contracts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const thisMonth = thisMonthContracts(contracts);
  const thisMonthRevenue = thisMonth.reduce(
    (sum, c) => sum + (c.commission_amount ?? calcCommission(c.contract_price, c.commission_type as "buyer" | "seller" | "both")),
    0
  );
  const totalRevenue = contracts.reduce(
    (sum, c) => sum + (c.commission_amount ?? calcCommission(c.contract_price, c.commission_type as "buyer" | "seller" | "both")),
    0
  );
  const monthlyData = groupByMonth(contracts);
  const agentData = groupByAgent(contracts);
  const previewCommission = calcPrice ? calcCommission(Number(calcPrice), calcType) : 0;

  const inputSt: React.CSSProperties = { padding: "7px 10px", border: "1px solid #e0deda", borderRadius: 7, fontSize: 12, fontFamily: "inherit" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>売上管理</h1>
        <p style={{ fontSize: 12, color: "#706e68", marginTop: 4 }}>仲介手数料の集計・レポート</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "今月の成約", value: thisMonth.length, unit: "件", color: "#234f35" },
          { label: "今月の手数料", value: Math.round(thisMonthRevenue).toLocaleString(), unit: "万円", color: "#1a3f6e" },
          { label: "累計成約", value: contracts.length, unit: "件", color: "#7a5c00" },
          { label: "累計手数料", value: Math.round(totalRevenue).toLocaleString(), unit: "万円", color: "#8c1f1f" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: "18px 20px", borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 10, color: "#706e68", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>
              {loading ? "—" : k.value}
              <span style={{ fontSize: 12, fontWeight: 400, color: "#706e68", marginLeft: 3, fontFamily: "inherit" }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Monthly breakdown */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", fontSize: 13, fontWeight: 500 }}>月次推移（直近6ヶ月）</div>
          {loading ? (
            <div style={{ padding: "24px 20px", color: "#706e68", fontSize: 12 }}>読み込み中...</div>
          ) : monthlyData.length === 0 ? (
            <div style={{ padding: "24px 20px", color: "#706e68", fontSize: 12 }}>データがありません</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f7f6f2" }}>
                  {["月", "成約件数", "手数料合計"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".06em", padding: "8px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.month} style={{ borderBottom: "1px solid #f3f2ef" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{m.month}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{m.contracts}件</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#234f35" }}>{Math.round(m.revenue).toLocaleString()}万円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Per-agent breakdown */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", fontSize: 13, fontWeight: 500 }}>担当者別実績</div>
          {loading ? (
            <div style={{ padding: "24px 20px", color: "#706e68", fontSize: 12 }}>読み込み中...</div>
          ) : agentData.length === 0 ? (
            <div style={{ padding: "24px 20px", color: "#706e68", fontSize: 12 }}>データがありません</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f7f6f2" }}>
                  {["担当者", "成約件数", "手数料合計"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".06em", padding: "8px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentData.map((a) => (
                  <tr key={a.agent_id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{a.agent_id}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{a.contracts}件</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#234f35" }}>{Math.round(a.revenue).toLocaleString()}万円</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Commission calculator */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>仲介手数料シミュレーター</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>売買価格（万円）</label>
            <input type="number" value={calcPrice} onChange={(e) => setCalcPrice(e.target.value)} placeholder="8000" style={{ ...inputSt, width: 140 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#706e68", display: "block", marginBottom: 4 }}>仲介形態</label>
            <select value={calcType} onChange={(e) => setCalcType(e.target.value as "both" | "buyer" | "seller")} style={{ ...inputSt, width: 140 }}>
              <option value="both">両手仲介</option>
              <option value="buyer">片手（買主側）</option>
              <option value="seller">片手（売主側）</option>
            </select>
          </div>
          <div style={{ padding: "10px 20px", background: previewCommission > 0 ? "#e6f4ea" : "#f7f6f2", borderRadius: 8, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: "#706e68", marginBottom: 4 }}>仲介手数料（税込・上限）</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: previewCommission > 0 ? "#234f35" : "#706e68", fontFamily: "monospace" }}>
              {previewCommission > 0 ? `${previewCommission.toLocaleString()}万円` : "—"}
            </div>
          </div>
        </div>
        {calcPrice && Number(calcPrice) > 400 && (
          <p style={{ fontSize: 11, color: "#706e68", marginTop: 10 }}>
            計算式: 売買価格 × 3% + 6万円 × 1.1（消費税）
            {calcType === "both" ? " × 2（両手）" : "（片手）"}
            = {previewCommission.toLocaleString()}万円
          </p>
        )}
      </div>

      {/* Recent completed contracts */}
      {contracts.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0deda", overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e0deda", fontSize: 13, fontWeight: 500 }}>成約履歴</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f7f6f2" }}>
                {["物件", "契約価格", "手数料", "担当者", "契約日"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 500, color: "#706e68", letterSpacing: ".06em", padding: "8px 16px", borderBottom: "1px solid #e0deda" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.slice(0, 20).map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f2ef" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>
                    {c.property ? `${TYPE_LABELS[c.property.property_type] ?? c.property.property_type}｜${c.property.city}${c.property.address}` : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>{c.contract_price.toLocaleString()}万円</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#234f35" }}>
                    {(c.commission_amount ?? Math.round(calcCommission(c.contract_price, c.commission_type as "buyer" | "seller" | "both"))).toLocaleString()}万円
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#706e68" }}>{c.agent_id ?? "—"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#706e68" }}>
                    {c.contract_date ? new Date(c.contract_date).toLocaleDateString("ja-JP") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
