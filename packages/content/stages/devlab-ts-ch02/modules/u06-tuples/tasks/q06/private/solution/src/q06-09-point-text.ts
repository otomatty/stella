// 問9 引数の位置で分割代入して（function pointText([x, y]: [number, number])）、「(x, y)」を返す
//     例: pointText([1, 2]) → "(1, 2)"
// 引数と戻り値には型注釈を付けます。
export function pointText([x, y]: [number, number]): string {
  return `(${x}, ${y})`;
}
