// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問14
export type Unit = "mm" | "cm" | "m";

export function toMillimeters(value: number, unit: Unit): number {
  if (unit === "m") {
    return value * 1000;
  }
  if (unit === "cm") {
    return value * 10;
  }
  return value;
}
