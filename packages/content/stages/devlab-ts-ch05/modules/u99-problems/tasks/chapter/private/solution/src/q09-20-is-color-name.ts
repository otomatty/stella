// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

// 問20
export function isColorName(value: string): value is "red" | "green" | "blue" {
  return value === "red" || value === "green" || value === "blue";
}
