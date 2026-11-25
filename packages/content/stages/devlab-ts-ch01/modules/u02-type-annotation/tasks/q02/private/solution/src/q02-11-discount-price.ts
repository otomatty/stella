// 問11 percentOff パーセント引きの価格を返す（1円未満は切り捨て）
//     例: discountPrice(1000, 15) → 850
// 戻り値には型注釈を付けてください。
export function discountPrice(price: number, percentOff: number): number {
  return Math.floor((price * (100 - percentOff)) / 100);
}
