// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

// 問3
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
