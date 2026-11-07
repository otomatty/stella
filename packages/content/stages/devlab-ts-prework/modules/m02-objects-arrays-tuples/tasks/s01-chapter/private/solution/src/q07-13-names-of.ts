// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export type Robot = { name: string; version: number };

// 問13
export function namesOf(items: readonly { name: string }[]): string[] {
  return items.map((item) => item.name);
}
