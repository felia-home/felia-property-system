import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canTransition, type WorkflowStatus } from "@/lib/workflow";
import { generateChecklist, getPendingTasks } from "@/lib/property-checklist";

/**
 * POST /api/properties/[id]/status
 * body: { status: WorkflowStatus, note?: string, metadata?: {
 *   method?: string, confirmed_by?: string, file_url?: string
 * }}
 *
 * 処理:
 * 1. 遷移可否チェック（workflow.ts の ALLOWED_TRANSITIONS に基づく）
 * 2. ステータス更新 + 関連フィールド更新
 * 3. PropertyHistoryに記録
 * 4. pending_tasks 再計算
 * 5. 次のアクション提案を返す
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status: newStatus, note, metadata = {} } = await request.json() as {
      status: string;
      note?: string;
      metadata?: { method?: string; confirmed_by?: string; file_url?: string };
    };

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { images: { select: { room_type: true } } },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const currentStatus = property.status as WorkflowStatus;
    const targetStatus = newStatus as WorkflowStatus;

    if (!canTransition(currentStatus, targetStatus)) {
      return NextResponse.json({
        error: `「${currentStatus}」から「${targetStatus}」への遷移はできません`,
        current: currentStatus,
      }, { status: 400 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = { status: targetStatus };

    switch (targetStatus) {
      case "AD_REQUEST":
        updateData.ad_confirmation_sent_at = new Date();
        if (metadata.method) updateData.ad_confirmation_method = metadata.method;
        break;

      case "AD_OK":
        updateData.ad_confirmed_at = new Date();
        if (metadata.confirmed_by) updateData.ad_confirmed_by = metadata.confirmed_by;
        if (metadata.file_url) updateData.ad_confirmation_file = metadata.file_url;
        break;

      case "READY_TO_PUBLISH":
        // No special fields — transition is manual, photo checks done on frontend
        break;

      case "PUBLISHED":
        if (!property.published_at) updateData.published_at = new Date();
        updateData.last_confirmed_at = new Date();
        break;

      case "SOLD":
      case "CLOSED":
        updateData.published_hp = false;
        updateData.published_members = false;
        updateData.published_suumo = false;
        updateData.published_athome = false;
        updateData.published_yahoo = false;
        updateData.published_homes = false;
        break;

      default:
        break;
    }

    // Apply update
    const updated = await prisma.property.update({
      where: { id: params.id },
      data: updateData,
    });

    // Recalculate pending_tasks
    const checks = generateChecklist({ ...updated, images: property.images });
    const pending = getPendingTasks(checks);
    const finalProperty = await prisma.property.update({
      where: { id: params.id },
      data: { pending_tasks: pending },
    });

    // Log history
    await prisma.propertyHistory.create({
      data: {
        property_id: params.id,
        changed_by: metadata.confirmed_by ?? "admin",
        change_type: "STATUS_CHANGE",
        changed_fields: { from: currentStatus, to: updated.status },
        note: note ?? null,
      },
    });

    // Build next-action guide
    const guides: Record<string, string> = {
      AD_REQUEST: "広告確認書を元付業者に送付し、承諾の返答をお待ちください",
      AD_OK: "写真・原稿を準備して「掲載準備完了」に進めてください",
      AD_NG: "下書きに戻して物件情報を修正するか、取扱いを中止してください",
      READY_TO_PUBLISH: "掲載内容を最終確認の上、「掲載する」で公開してください",
      PUBLISHED: "掲載開始しました。問い合わせが入り次第対応してください",
      SOLD_ALERT: "元付業者に物件確認（物確）を行ってください",
      SOLD: "成約データを記録の上、クローズしてください",
      CLOSED: "物件をアーカイブしました",
    };

    return NextResponse.json({
      property: finalProperty,
      next_action: guides[updated.status as string] ?? null,
    });
  } catch (error) {
    console.error("POST /api/properties/[id]/status error:", error);
    return NextResponse.json({ error: "ステータス更新に失敗しました" }, { status: 500 });
  }
}
