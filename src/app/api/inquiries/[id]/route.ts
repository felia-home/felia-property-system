import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        assigned_staff: { select: { id: true, name: true, permission: true } },
        property: { select: { id: true, property_number: true, city: true, town: true, price: true, status: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        activities: { orderBy: { created_at: "desc" } },
      },
    });
    if (!inquiry) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error("GET /api/inquiries/[id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const UPDATABLE = ["status", "priority", "internal_memo", "message", "customer_note",
      "visit_hope", "document_hope", "first_contact_at", "response_time_min"];
    const data: Record<string, unknown> = {};
    for (const k of UPDATABLE) {
      if (k in body) data[k] = body[k];
    }
    if ("first_contact_at" in body && body.first_contact_at) {
      data.first_contact_at = new Date(body.first_contact_at as string);
    }
    const inquiry = await prisma.inquiry.update({ where: { id: params.id }, data });
    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error("PUT /api/inquiries/[id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
