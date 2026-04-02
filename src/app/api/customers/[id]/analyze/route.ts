import { NextRequest, NextResponse } from "next/server";
import { analyzeCustomer } from "@/agents/customer-ai";

// POST /api/customers/[id]/analyze
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await analyzeCustomer(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/customers/[id]/analyze error:", error);
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}
