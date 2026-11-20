// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問7
export function addEvent(
  schedule: Record<Weekday, string[]>,
  day: Weekday,
  event: string,
): Record<Weekday, string[]> {
  return { ...schedule, [day]: [...schedule[day], event] };
}
