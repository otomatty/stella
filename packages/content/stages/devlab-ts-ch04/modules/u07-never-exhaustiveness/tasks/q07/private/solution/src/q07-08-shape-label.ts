// 問8 「円（半径 2）」「正方形（1辺 3）」を返す
//     例: shapeLabel({ kind: "circle", radius: 2 }) → "円（半径 2）"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

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
