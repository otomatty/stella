// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Cat = { name: string; age: number; meow: string };

export type Robot = { name: string; version: number };

// 問1
export function nameOf(x: { name: string }): string {
  return x.name;
}
