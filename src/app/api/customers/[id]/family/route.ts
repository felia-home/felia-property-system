import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/customers/[id]/family
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const members = await prisma.familyMember.findMany({
      where: { customer_id: params.id },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/customers/[id]/family error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST /api/customers/[id]/family
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.relation) {
      return NextResponse.json({ error: "続柄は必須です" }, { status: 400 });
    }

    const member = await prisma.familyMember.create({
      data: {
        customer_id: params.id,
        relation: body.relation,
        name: body.name ?? null,
        name_kana: body.name_kana ?? null,
        age: body.age ? Number(body.age) : null,
        birth_year: body.birth_year ? Number(body.birth_year) : null,
        occupation: body.occupation ?? null,
        annual_income: body.annual_income ? Number(body.annual_income) : null,
        note: body.note ?? null,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers/[id]/family error:", error);
    return NextResponse.json({ error: "家族の登録に失敗しました" }, { status: 500 });
  }
}
