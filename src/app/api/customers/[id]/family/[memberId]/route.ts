import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/customers/[id]/family/[memberId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const body = await request.json();

    const member = await prisma.familyMember.update({
      where: { id: params.memberId, customer_id: params.id },
      data: {
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

    return NextResponse.json({ member });
  } catch (error) {
    console.error("PATCH /api/customers/[id]/family/[memberId] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/customers/[id]/family/[memberId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    await prisma.familyMember.delete({
      where: { id: params.memberId, customer_id: params.id },
    });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("DELETE /api/customers/[id]/family/[memberId] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
