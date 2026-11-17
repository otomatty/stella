// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

// 問8
export function shapeLabel(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return `円（半径 ${shape.radius}）`;
    case "square":
      return `正方形（1辺 ${shape.size}）`;
    default:
      return assertNever(shape);
  }
}
