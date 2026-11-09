// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問8
export function busiestDay(schedule: Record<Weekday, string[]>): Weekday {
  const days: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];
  let best: Weekday = "mon";
  for (const day of days) {
    if (schedule[day].length > schedule[best].length) {
      best = day;
    }
  }
  return best;
}
