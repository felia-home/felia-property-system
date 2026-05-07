import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<{
    store_id:   string;
    rule_type:  string;
    rule_value: string;
    priority:   number;
    is_active:  boolean;
  }>;

  const rule = await prisma.storeRoutingRule.update({
    where: { id: params.id },
    data: {
      ...(body.store_id   !== undefined ? { store_id:   body.store_id }   : {}),
      ...(body.rule_type  !== undefined ? { rule_type:  body.rule_type }  : {}),
      ...(body.rule_value !== undefined ? { rule_value: body.rule_value } : {}),
      ...(body.priority   !== undefined ? { priority:   body.priority }   : {}),
      ...(body.is_active  !== undefined ? { is_active:  body.is_active }  : {}),
    },
    include: { store: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.storeRoutingRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
