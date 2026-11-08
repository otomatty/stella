// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問2
export function isNum(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}
