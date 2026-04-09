import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (customerId) where.customer_id = customerId;
  if (status) where.status = status;

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      property: { select: { id: true, city: true, town: true } },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  // BigInt をシリアライズ
  const serialized = contracts.map((c) => ({
    ...c,
    price:          c.price          !== null ? Number(c.price)          : null,
    price_land:     c.price_land     !== null ? Number(c.price_land)     : null,
    price_building: c.price_building !== null ? Number(c.price_building) : null,
    price_tax:      c.price_tax      !== null ? Number(c.price_tax)      : null,
    deposit:        c.deposit        !== null ? Number(c.deposit)        : null,
  }));

  return NextResponse.json({ contracts: serialized });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customer_id) {
      return NextResponse.json({ error: "customer_id は必須です" }, { status: 400 });
    }

    const parseBigInt = (val: unknown) => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(String(val).replace(/,/g, ""));
      return isNaN(n) ? null : BigInt(n);
    };

    const contract = await prisma.contract.create({
      data: {
        customer_id:         body.customer_id,
        property_id:         body.property_id         || null,
        contract_category:   body.contract_category,
        property_type_doc:   body.property_type_doc,
        price_type:          body.price_type          ?? "売買代金固定",
        seller_name:         body.seller_name         || null,
        seller_name_kana:    body.seller_name_kana    || null,
        seller_address:      body.seller_address      || null,
        seller_phone:        body.seller_phone        || null,
        seller_company:      body.seller_company      || null,
        buyer_name:          body.buyer_name          || null,
        buyer_name_kana:     body.buyer_name_kana     || null,
        buyer_address:       body.buyer_address       || null,
        buyer_phone:         body.buyer_phone         || null,
        property_address:    body.property_address    || null,
        property_area_land:  body.property_area_land  || null,
        property_area_build: body.property_area_build || null,
        property_structure:  body.property_structure  || null,
        property_built_year: body.property_built_year || null,
        price:          parseBigInt(body.price),
        price_land:     parseBigInt(body.price_land),
        price_building: parseBigInt(body.price_building),
        price_tax:      parseBigInt(body.price_tax),
        deposit:        parseBigInt(body.deposit),
        deposit_deadline: body.deposit_deadline ? new Date(body.deposit_deadline) : null,
        delivery_date:    body.delivery_date    ? new Date(body.delivery_date)    : null,
        contract_date:    body.contract_date    ? new Date(body.contract_date)    : null,
        zoning:            body.zoning            || null,
        building_coverage: body.building_coverage || null,
        floor_area_ratio:  body.floor_area_ratio  || null,
        takken_staff_id:   body.takken_staff_id   || null,
        notes:             body.notes             || null,
      },
    });

    return NextResponse.json({ success: true, contract: { id: contract.id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
