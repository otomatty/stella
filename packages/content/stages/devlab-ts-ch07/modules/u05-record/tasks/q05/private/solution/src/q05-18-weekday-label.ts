// 問18 定数 WEEKDAY_LABELS を Record<Weekday, string> として宣言して export し（mon は "月"、tue は "火"、wed は "水"、thu は "木"、fri は "金"）、weekdayLabel(day) でその名前を返す
//     例: weekdayLabel("wed") → "水"
// 引数と戻り値に型注釈を付けます。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

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
