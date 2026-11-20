// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問10
export function formatJapanese(date: Date): string {
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekday}）`;
}
