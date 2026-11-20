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

// 問20
export function nextMonthName(month: number): string {
  if (month < 1 || month > 12) {
    throw new Error("月は1〜12にしてください");
  }
  const name = MONTH_NAMES[month % 12];
  if (name === undefined) {
    throw new Error("月は1〜12の整数にしてください");
  }
  return name;
}
