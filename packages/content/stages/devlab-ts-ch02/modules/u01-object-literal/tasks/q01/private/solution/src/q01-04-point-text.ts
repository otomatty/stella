// 問4 座標 { x, y } を「(x, y)」の文字列にする
//     例: pointText({ x: 1, y: 2 }) → "(1, 2)"
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function pointText(point: { x: number; y: number }): string {
  return `(${point.x}, ${point.y})`;
}
