// 問20 月（1〜12）の次の月の名前を MONTH_NAMES から返す。12月の次は「1月」。範囲外なら Error を投げる
//     例: nextMonthName(12) → "1月"
// 引数と戻り値に型注釈を付ける。

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
