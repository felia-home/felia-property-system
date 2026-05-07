import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rules, stores] = await Promise.all([
    prisma.storeRoutingRule.findMany({
      include: { store: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { created_at: "asc" }],
    }),
    prisma.store.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ rules, stores });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    store_id:    string;
    rule_type:   string;
    rule_value:  string;
    priority?:   number;
    is_active?:  boolean;
  };

  if (!body.store_id || !body.rule_type || !body.rule_value) {
    return NextResponse.json({ error: "store_id, rule_type, rule_value are required" }, { status: 400 });
  }

  const rule = await prisma.storeRoutingRule.create({
    data: {
      store_id:   body.store_id,
      rule_type:  body.rule_type,
      rule_value: body.rule_value,
      priority:   body.priority  ?? 10,
      is_active:  body.is_active ?? true,
    },
    include: { store: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
