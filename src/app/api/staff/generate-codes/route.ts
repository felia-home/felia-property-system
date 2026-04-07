import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateStaffCode } from "@/lib/staffCode";

// POST /api/staff/generate-codes — 全スタッフのコードを一括生成
export async function POST() {
  try {
    const staffList = await prisma.staff.findMany({
      where: { is_active: true },
      select: { id: true, name: true, staff_code: true },
      orderBy: { created_at: "asc" },
    });

    const results: { name: string; code: string; generated: boolean }[] = [];

    for (const staff of staffList) {
      if (staff.staff_code) {
        // 既に設定済み
        results.push({ name: staff.name, code: staff.staff_code, generated: false });
        continue;
      }

      const code = await generateStaffCode(staff.id);
      await prisma.staff.update({
        where: { id: staff.id },
        data: { staff_code: code },
      });
      results.push({ name: staff.name, code, generated: true });
    }

    const generatedCount = results.filter(r => r.generated).length;
    return NextResponse.json({
      success: true,
      total: results.length,
      generated: generatedCount,
      results,
    });
  } catch (error) {
    console.error("POST /api/staff/generate-codes error:", error);
    return NextResponse.json({ error: "コード生成に失敗しました" }, { status: 500 });
  }
}
