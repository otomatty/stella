// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問19
export function latest(dates: Date[]): Date | undefined {
  let result: Date | undefined;
  for (const date of dates) {
    if (result === undefined || date.getTime() > result.getTime()) {
      result = date;
    }
  }
  return result;
}
