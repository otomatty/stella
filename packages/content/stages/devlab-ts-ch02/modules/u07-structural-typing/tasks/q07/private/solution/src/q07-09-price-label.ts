// 問9 「名前: 価格円」を返す。Product でも Service でも渡せる
//     例: priceLabel(りんご) → "りんご: 150円"
// 引数と戻り値には型注釈を付けます。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

export function priceLabel(x: { name: string; price: number }): string {
  return `${x.name}: ${x.price}円`;
}
