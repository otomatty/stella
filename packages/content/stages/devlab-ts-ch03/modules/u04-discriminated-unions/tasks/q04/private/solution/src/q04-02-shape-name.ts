// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

// 問2
export function shapeName(shape: Shape): "円" | "正方形" | "長方形" {
  switch (shape.kind) {
    case "circle":
      return "円";
    case "square":
      return "正方形";
    case "rect":
      return "長方形";
  }
}
