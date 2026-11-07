// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Dog = { name: string; age: number; breed: string };

// 問2
export function nameLength(x: { name: string }): number {
  return x.name.length;
}
