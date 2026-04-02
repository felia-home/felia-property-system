import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const assigned_to = searchParams.get("assigned_to");
    const priority = searchParams.get("priority");
    const limit = Number(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (source && source !== "ALL") where.source = source;
    if (assigned_to) where.assigned_to = assigned_to;
    if (priority && priority !== "ALL") where.priority = priority;

    const [inquiries, counts] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          assigned_staff: { select: { id: true, name: true } },
          property: { select: { id: true, property_number: true, city: true, town: true } },
        },
        orderBy: [{ priority: "desc" }, { received_at: "desc" }],
        take: limit,
      }),
      prisma.inquiry.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(counts.map(c => [c.status, c._count.id]));

    return NextResponse.json({ inquiries, statusCounts });
  } catch (error) {
    console.error("GET /api/inquiries error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    const inquiry = await prisma.inquiry.create({
      data: {
        source: (body.source as string) ?? "OTHER",
        received_at: body.received_at ? new Date(body.received_at as string) : new Date(),
        inquiry_type: (body.inquiry_type as string) ?? "GENERAL",
        customer_name: (body.customer_name as string) ?? null,
        customer_email: (body.customer_email as string) ?? null,
        customer_tel: (body.customer_tel as string) ?? null,
        message: (body.message as string) ?? null,
        visit_hope: Boolean(body.visit_hope),
        document_hope: Boolean(body.document_hope),
        priority: (body.priority as string) ?? "NORMAL",
        property_number: (body.property_number as string) ?? null,
        status: "NEW",
      },
    });

    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    console.error("POST /api/inquiries error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
