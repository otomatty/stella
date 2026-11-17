// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

// 問8
export function isFree(x: { price: number }): boolean {
  return x.price === 0;
}
