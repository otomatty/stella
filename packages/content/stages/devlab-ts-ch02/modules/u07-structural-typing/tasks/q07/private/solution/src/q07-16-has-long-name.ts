// 問16 name が max 文字より長ければ true
//     例: hasLongName(R2, 3) → false
// 引数と戻り値には型注釈を付けます。

export type Robot = { name: string; version: number };

export type Product = { name: string; price: number; stock: number };

export function hasLongName(x: { name: string }, max: number): boolean {
  return x.name.length > max;
}
