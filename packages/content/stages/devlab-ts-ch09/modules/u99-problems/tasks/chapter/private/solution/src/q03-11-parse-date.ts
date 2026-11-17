// 09-q03 Date ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/date

// 問11
export function parseDate(text: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) {
    throw new Error(`日付の形が違います: ${text}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
