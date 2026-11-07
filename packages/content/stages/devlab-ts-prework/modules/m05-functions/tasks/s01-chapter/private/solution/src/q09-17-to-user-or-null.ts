// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type User = { name: string; age: number };

// 問17
export function toUserOrNull(value: unknown): User | null {
  const looksLikeUser = (v: unknown): v is User =>
    typeof v === "object" &&
    v !== null &&
    "name" in v &&
    "age" in v &&
    typeof v.name === "string" &&
    typeof v.age === "number";
  return looksLikeUser(value) ? value : null;
}
