// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

// 問11
export function olderName(
  a: { name: string; age: number },
  b: { name: string; age: number },
): string {
  return b.age > a.age ? b.name : a.name;
}
