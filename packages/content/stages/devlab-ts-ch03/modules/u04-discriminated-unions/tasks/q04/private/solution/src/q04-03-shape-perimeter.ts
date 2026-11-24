// 問3 周りの長さを返す。円は 2 × Math.PI × 半径
//     例: shapePerimeter({ kind: "rect", width: 2, height: 3 }) → 10
// 引数と戻り値に型注釈を付ける。
// 定義済みの Shape 型を使い、kind で場合を分ける。

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export function shapePerimeter(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return 2 * Math.PI * shape.radius;
    case "square":
      return shape.size * 4;
    case "rect":
      return (shape.width + shape.height) * 2;
  }
}
