// 問16 value が min 以上 max 以下なら true を返す
//     例: isBetween(5, 1, 10) → true
// 戻り値には型注釈を付けてください。
export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
