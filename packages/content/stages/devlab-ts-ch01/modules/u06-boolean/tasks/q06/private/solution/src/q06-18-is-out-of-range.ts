// 問18 value が min より小さいか、max より大きければ true
//     例: isOutOfRange(11, 1, 10) → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function isOutOfRange(value: number, min: number, max: number): boolean {
  return value < min || value > max;
}
