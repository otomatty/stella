// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問20
export type Reading = { unit: "C"; value: number } | { unit: "F"; value: number };

export function toCelsius(reading: Reading): number {
  const celsius = reading.unit === "C" ? reading.value : ((reading.value - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
