import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAdConfirmationHTML } from "@/lib/ad-confirmation-template";

// GET /api/properties/[id]/ad-confirmation
// Returns print-ready HTML for the ad confirmation letter
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        seller_company: true,
        seller_contact: true,
        prefecture: true,
        city: true,
        town: true,
        property_type: true,
        price: true,
        reins_number: true,
        store_id: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    // Get company info from store or use defaults
    let companyName = "フェリアホーム株式会社";
    let licenseNumber: string | null = null;
    let phone: string | null = null;

    if (property.store_id) {
      const store = await prisma.store.findUnique({
        where: { id: property.store_id },
        include: { company: true },
      });
      if (store) {
        companyName = store.company?.name ?? companyName;
        licenseNumber = store.company?.license_number ?? null;
        phone = store.phone ?? null;
      }
    }

    const html = generateAdConfirmationHTML(property, {
      name: companyName,
      license_number: licenseNumber,
      phone,
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>広告掲載承諾依頼書</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
  }
  body { background: #fff; }
</style>
</head>
<body>
<div class="no-print" style="background:#234f35;color:#fff;padding:10px 20px;font-size:13px;font-family:sans-serif;display:flex;justify-content:space-between;align-items:center;">
  <span>広告掲載承諾依頼書 — プレビュー</span>
  <button onclick="window.print()" style="background:#fff;color:#234f35;border:none;padding:6px 16px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">印刷する</button>
</div>
${html}
</body>
</html>`;

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/properties/[id]/ad-confirmation error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
