import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canTransition, type PropertyStatus } from "@/lib/workflow-status";
import { generateChecklist, getPendingTasks } from "@/lib/property-checklist";

/**
 * POST /api/properties/[id]/status
 * body: { status: PropertyStatus, note?: string, metadata?: {
 *   method?: string, confirmed_by?: string, file_url?: string
 * }}
 *
 * 処理:
 * 1. 遷移可否チェック
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

    const currentStatus = property.status as PropertyStatus;
    const targetStatus = newStatus as PropertyStatus;

    if (!canTransition(currentStatus, targetStatus)) {
      return NextResponse.json({
        error: `「${currentStatus}」から「${targetStatus}」への遷移はできません`,
        current: currentStatus,
      }, { status: 400 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = { status: targetStatus };

    switch (targetStatus) {
      case "AD_SENT":
        updateData.ad_confirmation_sent_at = new Date();
        if (metadata.method) updateData.ad_confirmation_method = metadata.method;
        if (metadata.file_url) updateData.ad_confirmation_file = metadata.file_url;
        break;
      case "AD_OK":
        updateData.ad_confirmed_at = new Date();
        if (metadata.confirmed_by) updateData.ad_confirmed_by = metadata.confirmed_by;
        // Auto-transition: check photo requirements
        {
          const imgCount = property.images.length;
          const hasExterior = property.images.some(i => i.room_type === "外観");
          const hasFloorPlan = property.images.some(i => i.room_type === "間取り図");
          if (imgCount >= 5 && hasExterior && hasFloorPlan) {
            updateData.status = "PUBLISHING";
          } else {
            updateData.status = "PHOTO_NEEDED";
          }
        }
        break;
      case "PUBLISHED":
        if (!property.published_at) updateData.published_at = new Date();
        updateData.last_confirmed_at = new Date();
        break;
      case "SOLD":
      case "CLOSED":
        updateData.published_hp = false;
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
        changed_by: "admin",
        change_type: "STATUS_CHANGE",
        changed_fields: { from: currentStatus, to: updated.status },
        note: note ?? null,
      },
    });

    // Build next-action guide
    const guides: Record<string, string> = {
      AD_PENDING: "広告確認タブから確認書を送付してください",
      AD_SENT: "元付業者からの返信をお待ちください（3営業日以内が目安）",
      PHOTO_NEEDED: "写真タブから現地写真・間取り図をアップロードしてください",
      PUBLISHING: "掲載設定を確認し、各媒体に掲載を開始してください",
      PUBLISHED: "掲載中です。問い合わせが入り次第対応してください",
      SOLD: "成約登録を完了し、各媒体から掲載を取り下げてください",
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
