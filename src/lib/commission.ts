/**
 * 仲介手数料計算（不動産売買仲介手数料の上限 / 公正競争規約）
 * 消費税込み、万円単位で返す
 */
export function calcCommissionOneSide(priceMan: number): number {
  let base: number;
  if (priceMan <= 200) {
    base = priceMan * 0.05;
  } else if (priceMan <= 400) {
    base = priceMan * 0.04 + 2;
  } else {
    base = priceMan * 0.03 + 6;
  }
  return Math.round(base * 1.1 * 10) / 10;
}

/** type: "buyer" | "seller" = 片手仲介、"both" = 両手仲介 */
export function calcCommission(
  priceMan: number,
  type: "buyer" | "seller" | "both" = "both"
): number {
  const one = calcCommissionOneSide(priceMan);
  return type === "both" ? Math.round(one * 2 * 10) / 10 : one;
}
