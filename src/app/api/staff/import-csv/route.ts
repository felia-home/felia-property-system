import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// jinjer 雇用区分 → permission
const PERMISSION_MAP: Record<string, string> = {
  "役員": "ADMIN",
  "正社員": "AGENT",
  "契約社員": "AGENT",
  "嘱託社員": "AGENT",
  "パート": "BACKOFFICE",
  "アルバイト": "BACKOFFICE",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(field); field = ""; }
      else { field += ch; }
    }
  }
  result.push(field);
  return result;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // yyyy/mm/dd or yyyy-mm-dd
  const cleaned = raw.trim().replace(/\//g, "-");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "CSVファイルが必要です" }, { status: 400 });
    }

    // Shift_JIS → UTF-8 変換
    const arrayBuffer = await (file as File).arrayBuffer();
    const Encoding = (await import("encoding-japanese")).default;
    const uint8Array = new Uint8Array(arrayBuffer);
    const detected = Encoding.detect(uint8Array);
    const from = (!detected || detected === "UNICODE" || detected === "UTF8") ? "SJIS" : detected;
    const utf8Array = Encoding.convert(uint8Array, { to: "UTF8", from });
    const csvText = new TextDecoder("utf-8").decode(new Uint8Array(utf8Array));

    const lines = csvText.split("\n").map(l => l.replace(/\r$/, ""));
    if (lines.length < 2) {
      return NextResponse.json({ error: "データ行がありません" }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const dataRows = lines.slice(1).filter(l => l.trim());

    const getVal = (row: string[], col: string): string =>
      (row[headers.indexOf(col)] ?? "").trim();

    // デフォルト店舗・会社を取得
    const [defaultStore, company] = await Promise.all([
      prisma.store.findFirst(),
      prisma.company.findFirst(),
    ]);

    const results = { created: 0, updated: 0, skipped: 0, errors: 0 };

    for (const line of dataRows) {
      try {
        const row = parseCSVLine(line);

        const lastName = getVal(row, "職場氏名(氏)");
        const firstName = getVal(row, "職場氏名(名)");
        const name = `${lastName} ${firstName}`.trim();
        if (!name) { results.skipped++; continue; }

        const employeeNumber = getVal(row, "社員番号") || null;
        const emailWork = getVal(row, "E-Mail(社用)") || null;
        const employmentStatus = getVal(row, "在籍区分");
        const isActive = employmentStatus !== "退職";

        const staffData = {
          name,
          name_kana: [getVal(row, "職場氏名(氏)(フリガナ)"), getVal(row, "職場氏名(名)(フリガナ)")].filter(Boolean).join(" ") || null,
          employee_number: employeeNumber,
          email_work: emailWork,
          email_personal: getVal(row, "E-Mail(個人)") || null,
          tel_mobile: getVal(row, "携帯電話番号(社用)") || null,
          employment_type: getVal(row, "雇用区分") || null,
          permission: PERMISSION_MAP[getVal(row, "雇用区分")] ?? "AGENT",
          is_active: isActive,
          hire_date: parseDate(getVal(row, "入社年月日")),
          retirement_date: parseDate(getVal(row, "退職年月日")),
          birth_date: parseDate(getVal(row, "生年月日")),
          gender: getVal(row, "性別") === "男" ? "MALE" : getVal(row, "性別") === "女" ? "FEMALE" : null,
          store_id: defaultStore?.id ?? null,
          company_id: company?.id ?? null,
        };

        // 重複チェック: 社員番号 → メール の順で検索
        const existingWhere = [];
        if (employeeNumber) existingWhere.push({ employee_number: employeeNumber });
        if (emailWork) existingWhere.push({ email_work: emailWork });

        const existing = existingWhere.length > 0
          ? await prisma.staff.findFirst({ where: { OR: existingWhere } })
          : null;

        if (existing) {
          await prisma.staff.update({ where: { id: existing.id }, data: staffData });
          results.updated++;
        } else {
          await prisma.staff.create({ data: staffData });
          results.created++;
        }
      } catch (rowErr) {
        console.error("Staff import row error:", rowErr);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.created}件新規登録、${results.updated}件更新、${results.skipped}件スキップ、${results.errors}件エラー`,
      ...results,
    });
  } catch (error) {
    console.error("Staff CSV import error:", error);
    return NextResponse.json(
      { error: `インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
