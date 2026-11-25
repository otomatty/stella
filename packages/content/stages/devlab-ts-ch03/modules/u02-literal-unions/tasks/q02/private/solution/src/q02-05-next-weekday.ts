// 問5 次の平日を返す。金の次は月
//     例: nextWeekday("金") → "月"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Weekday 型を使う。

export type Weekday = "月" | "火" | "水" | "木" | "金";

export function nextWeekday(day: Weekday): Weekday {
  if (day === "月") {
    return "火";
  }
  if (day === "火") {
    return "水";
  }
  if (day === "水") {
    return "木";
  }
  if (day === "木") {
    return "金";
  }
  return "月";
}
