interface PropertyForTemplate {
  seller_company?: string | null;
  seller_contact?: string | null;
  seller_fax?: string | null;
  seller_agent?: string | null;
  prefecture?: string | null;
  city?: string | null;
  town?: string | null;
  address?: string | null;
  property_type?: string | null;
  price?: number | null;
  area_land_m2?: number | null;
  area_build_m2?: number | null;
  area_exclusive_m2?: number | null;
  published_hp?: boolean | null;
  published_suumo?: boolean | null;
  published_athome?: boolean | null;
  published_yahoo?: boolean | null;
  published_homes?: boolean | null;
}

interface CompanyForTemplate {
  name: string;
  store_name?: string | null;
  license_number?: string | null;
  phone?: string | null;
  fax?: string | null;
  agent_name?: string | null;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  NEW_HOUSE: "新築一戸建て",
  USED_HOUSE: "中古一戸建て",
  MANSION: "中古マンション",
  NEW_MANSION: "新築マンション",
  LAND: "土地",
};

function buildAreaText(property: PropertyForTemplate): string {
  const type = property.property_type ?? "";
  // マンションの場合は専有面積
  if ((type === "MANSION" || type === "NEW_MANSION") && property.area_exclusive_m2) {
    return `専有面積 ${property.area_exclusive_m2}㎡`;
  }
  // 戸建て・土地の場合
  const parts: string[] = [];
  if (property.area_land_m2) parts.push(`${property.area_land_m2}㎡（土地）`);
  if (property.area_build_m2) parts.push(`${property.area_build_m2}㎡（建物）`);
  if (parts.length === 0) return "";
  return parts.join(" / ");
}

function checkbox(checked: boolean | null | undefined): string {
  return checked ? "☑" : "□";
}

export function generateAdConfirmationHTML(
  property: PropertyForTemplate,
  company: CompanyForTemplate
): string {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  // 変更①: 宛名に元付業者名 + FAX
  const sellerName = property.seller_company ?? "";
  const sellerFaxDisplay = property.seller_fax ? `<span style="font-size: 13px; color: #666;">（FAX: ${property.seller_fax}）</span>` : "";
  const addressee = sellerName
    ? `${sellerName}　御中　${sellerFaxDisplay}`
    : "御中";

  // 変更②: 物件所在地（枝番まで）
  const fullAddress = [
    property.prefecture ?? "東京都",
    property.city ?? "",
    property.town ?? "",
    property.address ?? "",
  ].join("");

  // 変更③: 面積
  const areaText = buildAreaText(property);

  // 変更⑤⑥: 自社情報
  const companyLine = company.store_name
    ? `${company.name}　${company.store_name}`
    : company.name;

  return `
    <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1b18;">
      <h2 style="border-bottom: 2px solid #1c1b18; padding-bottom: 10px; font-size: 18px;">
        不動産広告掲載承諾依頼書
      </h2>
      <p style="margin: 16px 0;">${today}</p>
      <p style="margin: 16px 0; font-size: 15px;">
        ${addressee}
      </p>
      <p style="margin: 16px 0; line-height: 1.8;">
        拝啓 時下ますますご清栄のこととお慶び申し上げます。<br>
        下記物件について、弊社ホームページ及び不動産ポータルサイトへの
        広告掲載につきまして、ご承諾いただけますようお願い申し上げます。
      </p>
      <h3 style="font-size: 14px; margin: 24px 0 10px;">【対象物件】</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
        <tr>
          <th style="background: #f5f5f5; padding: 9px 12px; border: 1px solid #ddd; width: 30%; text-align: left; font-size: 13px;">物件所在地</th>
          <td style="padding: 9px 12px; border: 1px solid #ddd; font-size: 13px;">
            ${fullAddress}
          </td>
        </tr>
        <tr>
          <th style="background: #f5f5f5; padding: 9px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">物件種別</th>
          <td style="padding: 9px 12px; border: 1px solid #ddd; font-size: 13px;">
            ${PROPERTY_TYPE_LABELS[property.property_type ?? ""] ?? property.property_type ?? ""}
          </td>
        </tr>
        <tr>
          <th style="background: #f5f5f5; padding: 9px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">販売価格</th>
          <td style="padding: 9px 12px; border: 1px solid #ddd; font-size: 13px;">
            ${property.price ? property.price.toLocaleString() + " 万円" : "未定"}
          </td>
        </tr>
        ${areaText ? `
        <tr>
          <th style="background: #f5f5f5; padding: 9px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">面積</th>
          <td style="padding: 9px 12px; border: 1px solid #ddd; font-size: 13px;">
            ${areaText}
          </td>
        </tr>
        ` : ""}
        <tr>
          <th style="background: #f5f5f5; padding: 9px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">掲載予定媒体</th>
          <td style="padding: 9px 12px; border: 1px solid #ddd; font-size: 13px; line-height: 1.8;">
            ${checkbox(property.published_hp)} 自社ホームページ<br>
            ${checkbox(property.published_suumo)} SUUMO<br>
            ${checkbox(property.published_athome)} athome<br>
            ${checkbox(property.published_yahoo)} Yahoo!不動産<br>
            ${checkbox(property.published_homes)} HOME'S
          </td>
        </tr>
      </table>
      <p style="margin: 16px 0; line-height: 1.8;">
        ご承諾いただける場合は、本書にご捺印・ご署名の上、ご返送いただきますようお願い申し上げます。
      </p>
      <div style="margin-top: 32px; border: 1px solid #333; padding: 20px;">
        <p style="margin: 0 0 16px; font-weight: bold;">ご回答欄</p>
        <p style="margin: 0 0 10px;">□ 承諾します　　□ 承諾しません</p>
        <p style="margin: 0 0 10px;">会社名：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
        <p style="margin: 0 0 10px;">担当者：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
        <p style="margin: 0;">日　付：＿＿＿＿年＿＿月＿＿日</p>
      </div>
      <div style="margin-top: 24px; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 16px;">
        <p style="margin: 0 0 4px; font-weight: bold;">${companyLine}</p>
        ${company.agent_name ? `<p style="margin: 0 0 4px;">担当：${company.agent_name}</p>` : ""}
        ${company.license_number ? `<p style="margin: 0 0 4px;">宅建業免許番号：${company.license_number}</p>` : ""}
        ${company.phone ? `<p style="margin: 0 0 4px;">電話：${company.phone}</p>` : ""}
        ${company.fax ? `<p style="margin: 0;">FAX：${company.fax}</p>` : ""}
      </div>
    </div>
  `;
}
