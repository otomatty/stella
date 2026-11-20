// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問1
export function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}
