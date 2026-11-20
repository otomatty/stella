// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問16
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
