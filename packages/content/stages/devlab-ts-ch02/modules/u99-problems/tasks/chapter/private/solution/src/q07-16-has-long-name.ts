// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Robot = { name: string; version: number };

export type Product = { name: string; price: number; stock: number };

// 問16
export function hasLongName(x: { name: string }, max: number): boolean {
  return x.name.length > max;
}
