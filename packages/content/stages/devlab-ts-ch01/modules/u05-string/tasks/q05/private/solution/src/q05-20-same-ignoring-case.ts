// 問20 大文字と小文字の違いを無視して、同じ文字列なら true を返す
//     例: sameIgnoringCase("Agora", "AGORA") → true
// 戻り値には型注釈を付けてください。
// toLowerCase が使えます。
export function sameIgnoringCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
