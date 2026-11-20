// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type User = { name: string; age: number };

// 問16
export function assertUser(value: unknown): asserts value is User {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    !("age" in value) ||
    typeof value.name !== "string" ||
    typeof value.age !== "number"
  ) {
    throw new Error("User ではありません");
  }
}
