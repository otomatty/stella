// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問18
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
};

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}
