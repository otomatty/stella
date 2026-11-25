// 問1 税込価格を返す（税率10%。税額の1円未満は切り捨て）
//     例: addTax(1000) → 1100
export function addTax(price: number): number {
  const tax = Math.floor(price * 0.1);
  return price + tax;
}
