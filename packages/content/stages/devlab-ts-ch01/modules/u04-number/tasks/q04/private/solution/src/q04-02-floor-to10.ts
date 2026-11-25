// 問2 1の位を切り捨てる（10の倍数にする）
//     例: floorTo10(123) → 120
// 戻り値には型注釈を付けてください。
// Math.floor が使えます。
export function floorTo10(n: number): number {
  return Math.floor(n / 10) * 10;
}
