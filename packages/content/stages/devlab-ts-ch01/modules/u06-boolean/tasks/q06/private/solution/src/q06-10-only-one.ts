// 問10 どちらか片方だけが true なら true（両方 true なら false）
//     例: onlyOne(true, true) → false
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function onlyOne(a: boolean, b: boolean): boolean {
  return a !== b;
}
