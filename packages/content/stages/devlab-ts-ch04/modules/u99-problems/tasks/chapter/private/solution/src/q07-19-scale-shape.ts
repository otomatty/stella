// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

// 問19
export function scaleShape(shape: Shape, k: number): Shape {
  switch (shape.kind) {
    case "circle":
      return { kind: "circle", radius: shape.radius * k };
    case "square":
      return { kind: "square", size: shape.size * k };
    default:
      return assertNever(shape);
  }
}
