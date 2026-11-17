// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number

// 問11
export function parseIntOrZero(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isNaN(n) ? 0 : n;
}
