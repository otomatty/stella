// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

// 問18
export const WEEKEND = ["土", "日"] as const;

export function isWeekendDay(day: string): boolean {
  return WEEKEND.some((d) => d === day);
}
