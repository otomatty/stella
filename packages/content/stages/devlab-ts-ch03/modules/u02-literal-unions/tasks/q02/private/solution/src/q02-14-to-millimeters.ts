// 問14 型 Unit（"mm"、"cm"、"m"）を定義して export し、toMillimeters(value: number, unit: Unit) を書く。mm に直した値を返す
//     例: toMillimeters(1.5, "m") → 1500
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

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
