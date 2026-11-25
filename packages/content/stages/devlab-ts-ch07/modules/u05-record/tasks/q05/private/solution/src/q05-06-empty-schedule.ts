// 問6 すべての曜日が空の配列の Record<Weekday, string[]> を返す
//     例: emptySchedule() → { mon: [], tue: [], wed: [], thu: [], fri: [] }
// 戻り値に型注釈を付けます。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

export function emptySchedule(): Record<Weekday, string[]> {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] };
}
