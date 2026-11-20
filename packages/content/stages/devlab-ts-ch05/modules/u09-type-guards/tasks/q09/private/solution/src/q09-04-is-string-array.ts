// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問4
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
