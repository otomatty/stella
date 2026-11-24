// 問7 金なら true
//     例: isFriday("金") → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Weekday 型を使う。

export type Weekday = "月" | "火" | "水" | "木" | "金";

export function isFriday(day: Weekday): boolean {
  return day === "金";
}
