// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type User = { name: string; age: number };

// 問13
export function countUsers(values: readonly unknown[]): number {
  const looksLikeUser = (value: unknown): value is User =>
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "age" in value &&
    typeof value.name === "string" &&
    typeof value.age === "number";
  return values.filter(looksLikeUser).length;
}
