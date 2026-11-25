// 問13 part が total の何パーセントかを、整数に四捨五入して返す
//     例: percentOf(1, 3) → 33
// 戻り値には型注釈を付けてください。
// Math.round が使えます。
export function percentOf(part: number, total: number): number {
  return Math.round((part / total) * 100);
}
