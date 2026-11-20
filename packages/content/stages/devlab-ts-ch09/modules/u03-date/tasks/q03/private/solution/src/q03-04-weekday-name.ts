// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問4
export function weekdayName(date: Date): string {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
}
