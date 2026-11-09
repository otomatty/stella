// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問18
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
