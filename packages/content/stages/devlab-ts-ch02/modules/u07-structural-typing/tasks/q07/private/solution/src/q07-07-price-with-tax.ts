// 問7 税込価格（10%。1円未満は切り捨て）を返す。Product でも Service でも渡せる
//     例: priceWithTax(りんご) → 165
// 引数と戻り値には型注釈を付けます。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

export function priceWithTax(x: { price: number }): number {
  return Math.floor((x.price * 110) / 100);
}
