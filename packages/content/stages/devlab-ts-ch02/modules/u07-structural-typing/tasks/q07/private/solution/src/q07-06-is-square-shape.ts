// 問6 width と height が同じなら true
//     例: isSquareShape({ width: 5, height: 5 }) → true
// 引数と戻り値には型注釈を付けます。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export function isSquareShape(x: { width: number; height: number }): boolean {
  return x.width === x.height;
}
