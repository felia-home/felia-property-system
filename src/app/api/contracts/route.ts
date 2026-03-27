import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcCommission } from "@/lib/commission";

// GET /api/contracts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const property_id = searchParams.get("property_id");
    const customer_id = searchParams.get("customer_id");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (property_id) where.property_id = property_id;
    if (customer_id) where.customer_id = customer_id;

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: { customer: { select: { id: true, name: true } } },
      take: 200,
    });

    // Attach property info
    const propertyIds = [...new Set(contracts.map((c) => c.property_id))];
    const properties =
      propertyIds.length > 0
        ? await prisma.property.findMany({
            where: { id: { in: propertyIds } },
            select: { id: true, city: true, address: true, property_type: true, price: true },
          })
        : [];
    const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));

    const result = contracts.map((c) => ({
      ...c,
      property: propMap[c.property_id] ?? null,
    }));

    return NextResponse.json({ contracts: result, total: result.length });
  } catch (error) {
    console.error("GET /api/contracts error:", error);
    return NextResponse.json({ error: "契約一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/contracts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.property_id || !body.contract_price) {
      return NextResponse.json(
        { error: "property_id と contract_price は必須です" },
        { status: 400 }
      );
    }

    const price = Number(body.contract_price);
    const type = body.commission_type ?? "both";
    const commission = calcCommission(price, type as "buyer" | "seller" | "both");

    const contract = await prisma.contract.create({
      data: {
        property_id: body.property_id,
        customer_id: body.customer_id ?? null,
        agent_id: body.agent_id ?? null,
        status: body.status ?? "draft",
        contract_price: price,
        commission_type: type,
        commission_amount: Math.round(commission),
        commission_rate: body.commission_rate ?? null,
        contract_date: body.contract_date ? new Date(body.contract_date) : null,
        settlement_date: body.settlement_date ? new Date(body.settlement_date) : null,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contracts error:", error);
    return NextResponse.json({ error: "契約の登録に失敗しました" }, { status: 500 });
  }
}
