// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

// 問9
export function priceLabel(x: { name: string; price: number }): string {
  return `${x.name}: ${x.price}円`;
}
