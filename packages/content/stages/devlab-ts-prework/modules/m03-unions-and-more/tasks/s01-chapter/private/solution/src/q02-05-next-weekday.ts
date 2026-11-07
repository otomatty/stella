// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Weekday = "月" | "火" | "水" | "木" | "金";

// 問5
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
