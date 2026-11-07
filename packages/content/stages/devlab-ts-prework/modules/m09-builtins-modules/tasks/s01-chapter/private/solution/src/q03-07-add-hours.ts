// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問7
export function addHours(date: Date, h: number): Date {
  const result = new Date(date.getTime());
  result.setHours(result.getHours() + h);
  return result;
}
