// 問20 型 Reading（{ unit: "C"; value } か { unit: "F"; value }）を定義して export し、toCelsius(reading: Reading) を書く。摂氏にして小数第1位までに四捨五入（F は (value - 32) × 5 ÷ 9）
//     例: toCelsius({ unit: "F", value: 212 }) → 100
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Reading = { unit: "C"; value: number } | { unit: "F"; value: number };

export function toCelsius(reading: Reading): number {
  const celsius = reading.unit === "C" ? reading.value : ((reading.value - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
