// 問20 華氏を摂氏に変え、小数第1位までに四捨五入する（摂氏 = (華氏 - 32) × 5 ÷ 9）
//     例: fahrenheitToCelsius(98.6) → 37
// 戻り値には型注釈を付けてください。
// Math.round が使えます。
export function fahrenheitToCelsius(fahrenheit: number): number {
  const celsius = ((fahrenheit - 32) * 5) / 9;
  return Math.round(celsius * 10) / 10;
}
