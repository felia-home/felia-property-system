import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveStoreForMember } from "@/lib/store-routing";

// GET /api/members/[id]/profile
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { member_id: params.id },
    });
    return NextResponse.json({ profile });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/members/[id]/profile — 初回作成
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const profile = await prisma.memberProfile.create({
      data: {
        member_id: params.id,
        property_types:      Array.isArray(body.property_types)      ? (body.property_types as string[])      : [],
        desired_areas:       Array.isArray(body.desired_areas)       ? (body.desired_areas as string[])       : [],
        desired_lines:       Array.isArray(body.desired_lines)       ? (body.desired_lines as string[])       : [],
        desired_layout:      Array.isArray(body.desired_layout)      ? (body.desired_layout as string[])      : [],
        priority_points:     Array.isArray(body.priority_points)     ? (body.priority_points as string[])     : [],
        budget_max:          body.budget_max          != null ? Number(body.budget_max)          : null,
        desired_area_m2_min: body.desired_area_m2_min != null ? Number(body.desired_area_m2_min) : null,
        down_payment:        body.down_payment        != null ? Number(body.down_payment)        : null,
        current_rent:        body.current_rent        != null ? Number(body.current_rent)        : null,
        purchase_timing:     body.purchase_timing     ? String(body.purchase_timing)     : null,
        current_residence:   body.current_residence   ? String(body.current_residence)   : null,
        lease_expiry:        body.lease_expiry        ? String(body.lease_expiry)        : null,
        has_property_to_sell: body.has_property_to_sell ? String(body.has_property_to_sell) : null,
        family_structure:    body.family_structure    ? String(body.family_structure)    : null,
        children_ages:       body.children_ages       ? String(body.children_ages)       : null,
        annual_income_range: body.annual_income_range ? String(body.annual_income_range) : null,
        loan_preapproval:    body.loan_preapproval    ? String(body.loan_preapproval)    : null,
        purchase_motivation: body.purchase_motivation ? String(body.purchase_motivation) : null,
        other_agents:        body.other_agents        ? String(body.other_agents)        : null,
        remarks:             body.remarks             ? String(body.remarks)             : null,
      },
    });
    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/members/[id]/profile — upsert（作成 or 更新）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (Array.isArray(body.property_types))      data.property_types      = body.property_types;
    if (Array.isArray(body.desired_areas))       data.desired_areas       = body.desired_areas;
    if (Array.isArray(body.desired_lines))       data.desired_lines       = body.desired_lines;
    if (Array.isArray(body.desired_layout))      data.desired_layout      = body.desired_layout;
    if (Array.isArray(body.priority_points))     data.priority_points     = body.priority_points;
    if (body.budget_max          !== undefined)  data.budget_max          = body.budget_max != null ? Number(body.budget_max) : null;
    if (body.desired_area_m2_min !== undefined)  data.desired_area_m2_min = body.desired_area_m2_min != null ? Number(body.desired_area_m2_min) : null;
    if (body.down_payment        !== undefined)  data.down_payment        = body.down_payment != null ? Number(body.down_payment) : null;
    if (body.current_rent        !== undefined)  data.current_rent        = body.current_rent != null ? Number(body.current_rent) : null;
    const strFields = [
      "purchase_timing", "current_residence", "lease_expiry", "has_property_to_sell",
      "family_structure", "children_ages", "annual_income_range", "loan_preapproval",
      "purchase_motivation", "other_agents", "remarks",
    ];
    for (const k of strFields) {
      if (body[k] !== undefined) data[k] = body[k] ? String(body[k]) : null;
    }

    const profile = await prisma.memberProfile.upsert({
      where: { member_id: params.id },
      create: { member_id: params.id, ...data },
      update: data,
    });

    // 希望条件が更新された場合は customer.store_id を再評価
    // MemberProfile は property_types/desired_lines、Customer は
    // desired_property_type/desired_stations と命名が異なるため両方を許容
    try {
      const desiredAreas = Array.isArray(body.desired_areas)
        ? (body.desired_areas as string[]) : [];
      const desiredStations = Array.isArray(body.desired_stations)
        ? (body.desired_stations as string[])
        : Array.isArray(body.desired_lines)
          ? (body.desired_lines as string[]) : [];
      const desiredPropertyType = Array.isArray(body.desired_property_type)
        ? (body.desired_property_type as string[])
        : Array.isArray(body.property_types)
          ? (body.property_types as string[]) : [];

      const conditionTouched =
        body.desired_areas !== undefined ||
        body.desired_stations !== undefined ||
        body.desired_lines !== undefined ||
        body.desired_property_type !== undefined ||
        body.property_types !== undefined;

      if (conditionTouched) {
        const newStoreId = await resolveStoreForMember({
          desired_areas:         desiredAreas,
          desired_stations:      desiredStations,
          desired_property_type: desiredPropertyType,
        });
        if (newStoreId) {
          await prisma.customer.updateMany({
            where: { member_id: params.id },
            data:  { store_id: newStoreId },
          });
        }
      }
    } catch (e) {
      console.error("store-routing on profile update failed:", e);
    }

    return NextResponse.json({ success: true, profile });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
