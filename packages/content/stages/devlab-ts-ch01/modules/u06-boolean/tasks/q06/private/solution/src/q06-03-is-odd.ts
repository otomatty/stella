// 問3 奇数なら true（負の数でも正しく判定する）
//     例: isOdd(-3) → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function isOdd(n: number): boolean {
  return n % 2 !== 0;
}
