import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: { stores: { where: { is_active: true }, select: { id: true, name: true, store_code: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const company = await prisma.company.create({
      data: {
        name: body.name,
        name_kana: body.name_kana ?? null,
        license_number: body.license_number ?? null,
        license_expiry: body.license_expiry ? new Date(body.license_expiry) : null,
        postal_code: body.postal_code ?? null,
        address: body.address ?? null,
        phone: body.phone ?? null,
        fax: body.fax ?? null,
        representative: body.representative ?? null,
      },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
