// 問12 空の文字列か、空白だけなら true
//     例: isBlank("   ") → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}
