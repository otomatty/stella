// 問14 x と y から、どちらも読み取り専用の座標 { x, y } を作る
//     例: frozenPoint(1, 2) → { x: 1, y: 2 }
// 引数と戻り値には型注釈を付けます。
export function frozenPoint(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x, y };
}
