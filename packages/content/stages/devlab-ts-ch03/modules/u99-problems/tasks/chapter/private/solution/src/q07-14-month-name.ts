// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const MONTH_NAMES = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

// 問14
export function monthName(month: number): string {
  const name = MONTH_NAMES[month - 1];
  if (name === undefined) {
    throw new Error("月は1〜12にしてください");
  }
  return name;
}
