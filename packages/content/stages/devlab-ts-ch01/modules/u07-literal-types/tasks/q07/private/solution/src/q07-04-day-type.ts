// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問4
export function dayType(day: number): "平日" | "休日" {
  return day === 0 || day === 6 ? "休日" : "平日";
}
