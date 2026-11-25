// 問6 文字列の最初の1文字が Weekday のどれかならそれを返す。違えば undefined
//     例: parseWeekday("水曜日") → "水"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Weekday 型を使う。

export type Weekday = "月" | "火" | "水" | "木" | "金";

export function parseWeekday(text: string): Weekday | undefined {
  const first = text.slice(0, 1);
  if (first === "月" || first === "火" || first === "水" || first === "木" || first === "金") {
    return first;
  }
  return undefined;
}
