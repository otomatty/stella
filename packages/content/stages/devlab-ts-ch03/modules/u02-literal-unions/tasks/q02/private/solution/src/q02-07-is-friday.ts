// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Weekday = "月" | "火" | "水" | "木" | "金";

// 問7
export function isFriday(day: Weekday): boolean {
  return day === "金";
}
