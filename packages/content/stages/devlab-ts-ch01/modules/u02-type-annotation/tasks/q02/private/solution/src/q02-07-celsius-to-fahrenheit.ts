// 問7 摂氏を華氏に変える（華氏 = 摂氏 × 9 ÷ 5 + 32）
//     例: celsiusToFahrenheit(100) → 212
// 戻り値には型注釈を付けてください。
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}
