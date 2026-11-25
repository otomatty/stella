// 問7 formatYen を yen という名前で import し（import { 元の名前 as 新しい名前 }）、yen を使って priceLabel(price) を書く
//     例: priceLabel(1200) → "1,200円"
// import 元は ./shared/q05-modules.lib です。

import { formatYen as yen } from "./shared/q05-modules.lib";

export function priceLabel(price: number): string {
  return yen(price);
}
