// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

// 問5
export function scaleShape(shape: Shape, k: number): Shape {
  switch (shape.kind) {
    case "circle":
      return { kind: "circle", radius: shape.radius * k };
    case "square":
      return { kind: "square", size: shape.size * k };
    case "rect":
      return { kind: "rect", width: shape.width * k, height: shape.height * k };
  }
}
