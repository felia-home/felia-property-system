import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const UPDATABLE_FIELDS = [
  "customer_id", "agent_id", "status",
  "contract_price", "commission_type", "commission_amount", "commission_rate",
  "contract_date", "settlement_date", "notes",
];

// GET /api/contracts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });
    if (!contract) {
      return NextResponse.json({ error: "契約が見つかりません" }, { status: 404 });
    }

    const property = await prisma.property.findUnique({
      where: { id: contract.property_id },
      select: { id: true, city: true, address: true, property_type: true, price: true },
    });

    return NextResponse.json({ contract: { ...contract, property } });
  } catch (error) {
    console.error("GET /api/contracts/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PATCH /api/contracts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in body) {
        if (key === "contract_date" || key === "settlement_date") {
          data[key] = body[key] ? new Date(body[key] as string) : null;
        } else {
          data[key] = body[key];
        }
      }
    }

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ contract });
  } catch (error) {
    console.error("PATCH /api/contracts/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
