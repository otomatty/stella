// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

// 問17
export function averageAge(items: readonly { age: number }[]): number {
  if (items.length === 0) {
    return 0;
  }
  let total = 0;
  for (const item of items) {
    total += item.age;
  }
  return total / items.length;
}
