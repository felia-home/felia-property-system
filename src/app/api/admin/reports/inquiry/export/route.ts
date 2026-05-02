import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// CSV用のセル整形：ダブルクォートをエスケープ、改行/カンマを空白化
function csvCell(v: unknown): string {
  const s = (v ?? "").toString().replace(/[\r\n]+/g, " ").replace(/"/g, '""');
  return `"${s}"`;
}

// GET /api/admin/reports/inquiry/export?year=&month=&store_id=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year    = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  const month   = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const storeId = searchParams.get("store_id") ?? undefined;

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate   = new Date(year, month, 0, 23, 59, 59, 999);

  const inquiries = await prisma.inquiry.findMany({
    where: {
      created_at: { gte: startDate, lte: endDate },
      ...(storeId ? { store_id: storeId } : {}),
    },
    orderBy: { created_at: "desc" },
    select: {
      id:              true,
      source:          true,
      inquiry_type:    true,
      customer_name:   true,
      customer_email:  true,
      customer_tel:    true,
      property_name:   true,
      property_number: true,
      status:          true,
      assigned_to:     true,
      created_at:      true,
      message:         true,
    },
  });

  const headers = [
    "日時", "媒体", "種別", "顧客名", "メール", "電話",
    "物件名", "物件番号", "ステータス", "メッセージ",
  ];

  const rows = inquiries.map(inq => [
    inq.created_at.toISOString().slice(0, 19).replace("T", " "),
    inq.source ?? "",
    inq.inquiry_type ?? "",
    inq.customer_name ?? "",
    inq.customer_email ?? "",
    inq.customer_tel ?? "",
    inq.property_name ?? "",
    inq.property_number ?? "",
    inq.status ?? "",
    inq.message ?? "",
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(csvCell).join(","))
    .join("\r\n");

  // BOM付きUTF-8（Excelで文字化けしない）
  const body = "﻿" + csv;

  return new NextResponse(body, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inquiry_${year}_${month}.csv"`,
    },
  });
}
