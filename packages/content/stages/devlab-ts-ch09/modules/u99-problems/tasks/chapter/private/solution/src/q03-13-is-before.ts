// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問13
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}
