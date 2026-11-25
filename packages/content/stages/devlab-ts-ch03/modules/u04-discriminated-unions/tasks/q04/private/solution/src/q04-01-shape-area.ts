// 問1 面積を返す。円は Math.PI × 半径 × 半径
//     例: shapeArea({ kind: "square", size: 3 }) → 9
// 引数と戻り値に型注釈を付ける。
// 定義済みの Shape 型を使い、kind で場合を分ける。

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export function shapeArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "square":
      return shape.size * shape.size;
    case "rect":
      return shape.width * shape.height;
  }
}
