// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問20
export function sortDates(dates: Date[]): Date[] {
  return [...dates].sort((a, b) => a.getTime() - b.getTime());
}
