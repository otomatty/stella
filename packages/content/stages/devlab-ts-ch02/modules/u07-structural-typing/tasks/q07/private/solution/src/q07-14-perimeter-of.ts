// 問14 周りの長さ（(width + height) × 2）を返す
//     例: perimeterOf({ width: 3, height: 4 }) → 14
// 引数と戻り値には型注釈を付けます。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export function perimeterOf(x: { width: number; height: number }): number {
  return (x.width + x.height) * 2;
}
