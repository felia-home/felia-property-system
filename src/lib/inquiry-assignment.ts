import { prisma } from "@/lib/db";
import { ParsedInquiry } from "@/agents/inquiry-parser";

export async function assignInquiry(
  _inquiryId: string,
  _parsed: ParsedInquiry,
  propertyId?: string
): Promise<{ staffId: string; reason: string } | null> {
  // 1. 問い合わせ物件の担当営業を優先
  if (propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { agent_id: true, property_number: true },
    });
    if (property?.agent_id) {
      return {
        staffId: property.agent_id,
        reason: `担当物件（${property.property_number ?? ""}）の担当営業に振り分け`,
      };
    }
  }

  // 2. アクティブなスタッフを担当物件数が少ない順に取得
  const staffList = await prisma.staff.findMany({
    where: {
      is_active: true,
      permission: { in: ["ADMIN", "SENIOR_MANAGER", "MANAGER", "SENIOR_AGENT", "AGENT", "SENIOR"] },
    },
    include: {
      _count: {
        select: {
          properties_as_agent: {
            where: { status: { in: ["PUBLISHED", "AD_OK", "READY_TO_PUBLISH"] } },
          },
        },
      },
    },
  });

  if (staffList.length === 0) return null;

  const sorted = [...staffList].sort(
    (a, b) => (a._count?.properties_as_agent ?? 0) - (b._count?.properties_as_agent ?? 0)
  );

  const assigned = sorted[0];
  return {
    staffId: assigned.id,
    reason: `担当物件数が最も少ないスタッフ（${assigned.name}）に自動振り分け`,
  };
}
