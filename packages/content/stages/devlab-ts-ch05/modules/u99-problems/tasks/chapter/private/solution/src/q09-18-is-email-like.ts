// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問18
export function isEmailLike(value: unknown): value is string {
  return typeof value === "string" && value.includes("@");
}
