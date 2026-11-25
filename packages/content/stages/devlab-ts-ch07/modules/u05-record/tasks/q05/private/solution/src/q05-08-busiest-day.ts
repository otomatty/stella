// 問8 予定がいちばん多い曜日を返す。同じなら mon、tue… の順で先の方
//     例: busiestDay(schedule) → "wed"
// 引数と戻り値に型注釈を付けます。
// 予定表の型には Record<Weekday, string[]> を使います。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

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
