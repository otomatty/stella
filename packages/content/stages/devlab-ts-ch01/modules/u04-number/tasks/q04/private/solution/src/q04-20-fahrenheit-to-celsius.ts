// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number

// 問20
export function fahrenheitToCelsius(fahrenheit: number): number {
  const celsius = ((fahrenheit - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
