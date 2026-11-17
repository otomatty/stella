// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number

// 問13
export function percentOf(part: number, total: number): number {
  return Math.round((part / total) * 100);
}
