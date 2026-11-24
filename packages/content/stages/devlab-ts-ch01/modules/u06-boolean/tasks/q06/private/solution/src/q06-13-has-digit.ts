// 問13 数字（0〜9）が1文字でも含まれていれば true（正規表現 /\d/ の test メソッドを使う）
//     例: hasDigit("abc1") → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function hasDigit(text: string): boolean {
  return /\d/.test(text);
}
