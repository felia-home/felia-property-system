import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { canTransition } from "@/lib/workflow";
import { generateChecklist, getPendingTasks } from "@/lib/property-checklist";

// POST /api/properties/[id]/ad-confirmation/upload
// Multipart: file (PDF/image), result ("ok" | "ng"), confirmed_by
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const result = formData.get("result") as string | null; // "ok" | "ng"
    const confirmedBy = formData.get("confirmed_by") as string | null;

    if (!result || !["ok", "ng"].includes(result)) {
      return NextResponse.json(
        { error: "result は 'ok' または 'ng' を指定してください" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { images: { select: { id: true, room_type: true } } },
    });
    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const currentStatus = property.status;
    const newStatus = result === "ok" ? "AD_OK" : "AD_NG";

    // Allow transition from AD_REQUEST or DRAFT (if re-confirming)
    const allowedFromStatuses = ["AD_REQUEST", "DRAFT", "AD_NG"];
    if (!allowedFromStatuses.includes(currentStatus)) {
      return NextResponse.json(
        { error: `現在のステータス（${currentStatus}）からは遷移できません` },
        { status: 400 }
      );
    }

    // Upload file if provided
    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadFile(buffer, file.name, "properties");
      fileUrl = uploaded.url;
    }

    const now = new Date();

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      ad_confirmed_at: result === "ok" ? now : null,
      ad_confirmed_by: confirmedBy ?? null,
      ad_confirmation_file: fileUrl ?? property.ad_confirmation_file,
      last_confirmed_by: confirmedBy ?? null,
    };

    // Recalculate pending_tasks
    const merged = { ...property, ...updateData };
    const checks = generateChecklist({ ...merged, images: property.images });
    updateData.pending_tasks = getPendingTasks(checks);

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: updateData,
    });

    // PDF が新規アップロードされた場合、property_documents にも登録（重複スキップ）
    const savedPdfUrl = fileUrl ?? (property.ad_confirmation_file as string | null);
    if (savedPdfUrl) {
      const existing = await prisma.propertyDocument.findFirst({
        where: { property_id: params.id, url: savedPdfUrl },
      });
      if (!existing) {
        await prisma.propertyDocument.create({
          data: {
            property_id: params.id,
            name: "広告確認PDF",
            url: savedPdfUrl,
            file_type: "pdf",
            memo: "広告確認アップロードから自動登録",
          },
        }).catch(() => { /* 同時リクエスト等による重複は無視 */ });
      }
    }

    // Log to history
    await prisma.propertyHistory.create({
      data: {
        property_id: params.id,
        changed_by: confirmedBy ?? "system",
        change_type: "STATUS_CHANGE",
        changed_fields: { from: currentStatus, to: newStatus },
        note: `広告確認結果: ${result === "ok" ? "承諾" : "不可"}${confirmedBy ? ` (確認者: ${confirmedBy})` : ""}`,
      },
    });

    const nextAction =
      newStatus === "AD_OK"
        ? "写真の準備が整ったら「掲載準備完了」に進めてください"
        : "下書きに戻して再申請するか、取扱いを中止してください";

    return NextResponse.json({ property: updated, next_action: nextAction });
  } catch (error) {
    console.error("POST /api/properties/[id]/ad-confirmation/upload error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
