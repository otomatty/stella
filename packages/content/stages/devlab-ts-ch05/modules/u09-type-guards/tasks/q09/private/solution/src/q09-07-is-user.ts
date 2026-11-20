// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type User = { name: string; age: number };

// 問7
export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "age" in value &&
    typeof value.name === "string" &&
    typeof value.age === "number"
  );
}
