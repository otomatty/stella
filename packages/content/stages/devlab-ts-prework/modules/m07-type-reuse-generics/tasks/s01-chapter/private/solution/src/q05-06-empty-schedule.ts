// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問6
export function emptySchedule(): Record<Weekday, string[]> {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] };
}
