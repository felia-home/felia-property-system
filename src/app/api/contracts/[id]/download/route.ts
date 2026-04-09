import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { TEMPLATE_MAP, getTemplateKey } from "@/lib/contractTemplates";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const docType = searchParams.get("type") ?? "jyusetsu"; // jyusetsu | contract | cover | extra

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      takken_staff: true,
    },
  });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = getTemplateKey(
    contract.contract_category,
    contract.property_type_doc,
    contract.price_type
  );
  const templates = TEMPLATE_MAP[key];
  if (!templates) {
    return NextResponse.json(
      { error: `テンプレートが見つかりません: ${key}` },
      { status: 400 }
    );
  }

  const fileName = templates[docType as keyof typeof templates];
  if (!fileName) {
    return NextResponse.json(
      { error: "指定された書類種別が存在しません" },
      { status: 400 }
    );
  }

  const templatePath = path.join(process.cwd(), "templates", fileName);
  let templateBuffer: Buffer;
  try {
    templateBuffer = await readFile(templatePath);
  } catch {
    return NextResponse.json(
      { error: `テンプレートファイルが見つかりません: ${fileName}` },
      { status: 404 }
    );
  }

  const priceDisplay = (val: bigint | null) =>
    val !== null ? Number(val).toLocaleString("ja-JP") : "";

  const data = {
    seller_name:         contract.seller_name         ?? "",
    seller_name_kana:    contract.seller_name_kana    ?? "",
    seller_address:      contract.seller_address      ?? "",
    seller_phone:        contract.seller_phone        ?? "",
    seller_company:      contract.seller_company      ?? "",
    buyer_name:          contract.buyer_name          ?? contract.customer?.name ?? "",
    buyer_name_kana:     contract.buyer_name_kana     ?? "",
    buyer_address:       contract.buyer_address       ?? "",
    buyer_phone:         contract.buyer_phone         ?? "",
    property_address:    contract.property_address    ?? "",
    property_area_land:  contract.property_area_land  ?? "",
    property_area_build: contract.property_area_build ?? "",
    property_structure:  contract.property_structure  ?? "",
    property_built_year: contract.property_built_year ?? "",
    price:          priceDisplay(contract.price),
    price_land:     priceDisplay(contract.price_land),
    price_building: priceDisplay(contract.price_building),
    price_tax:      priceDisplay(contract.price_tax),
    deposit:        priceDisplay(contract.deposit),
    contract_date:    contract.contract_date?.toLocaleDateString("ja-JP")    ?? "",
    deposit_deadline: contract.deposit_deadline?.toLocaleDateString("ja-JP") ?? "",
    delivery_date:    contract.delivery_date?.toLocaleDateString("ja-JP")    ?? "",
    zoning:            contract.zoning            ?? "",
    building_coverage: contract.building_coverage ?? "",
    floor_area_ratio:  contract.floor_area_ratio  ?? "",
    takken_name:   contract.takken_staff?.name           ?? "",
    takken_number: contract.takken_staff?.takken_number  ?? "",
    company_name:    "株式会社フェリアホーム",
    company_license: "東京都知事（2）第104842号",
    company_address: "東京都渋谷区千駄ヶ谷4-16-7 北参道DTビル1階",
    company_tel:     "03-5981-8601",
    company_fax:     "03-5981-8602",
  };

  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(data);
    const output = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const downloadName = `${fileName.replace(".docx", "")}_${contract.buyer_name ?? "未設定"}.docx`;

    return new NextResponse(output, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Word生成エラー: ${msg}` }, { status: 500 });
  }
}
