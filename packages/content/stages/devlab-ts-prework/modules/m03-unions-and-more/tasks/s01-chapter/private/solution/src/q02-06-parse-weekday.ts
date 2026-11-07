// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Weekday = "月" | "火" | "水" | "木" | "金";

// 問6
export function parseWeekday(text: string): Weekday | undefined {
  const first = text.slice(0, 1);
  if (first === "月" || first === "火" || first === "水" || first === "木" || first === "金") {
    return first;
  }
  return undefined;
}
