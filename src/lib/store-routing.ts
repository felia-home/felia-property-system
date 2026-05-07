import { prisma } from "@/lib/db";

/**
 * 会員の希望条件から担当店舗IDを解決する。
 * 優先度の高いルール順に評価し、最初にマッチした store_id を返す。
 * どのルールにもマッチしない場合は DEFAULT ルールの store_id を返す（無ければ null）。
 */
export async function resolveStoreForMember(params: {
  desired_areas:         string[];
  desired_stations:      string[];
  desired_property_type: string[];
}): Promise<string | null> {
  const { desired_areas, desired_stations, desired_property_type } = params;

  const rules = await prisma.storeRoutingRule.findMany({
    where: { is_active: true },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (rule.rule_type === "DEFAULT") continue; // DEFAULTは最後にフォールバックで適用
    if (rule.rule_type === "AREA") {
      if (desired_areas.includes(rule.rule_value)) return rule.store_id;
    } else if (rule.rule_type === "STATION_LINE") {
      if (desired_stations.some(s => s.includes(rule.rule_value))) return rule.store_id;
    } else if (rule.rule_type === "PROPERTY_TYPE") {
      if (desired_property_type.includes(rule.rule_value)) return rule.store_id;
    }
  }

  const defaultRule = rules.find(r => r.rule_type === "DEFAULT");
  return defaultRule?.store_id ?? null;
}
