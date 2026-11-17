// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問17
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
