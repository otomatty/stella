// 問6 shared/q05-modules.lib から priceWithTax を import し、それを使って、税込みの金額を返す withTax(price) を書く
//     例: withTax(100) → 110

import { priceWithTax } from "./shared/q05-modules.lib";

export function withTax(price: number): number {
  return priceWithTax(price);
}
