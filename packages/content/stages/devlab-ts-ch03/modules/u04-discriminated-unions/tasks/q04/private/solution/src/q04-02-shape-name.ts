// 問2 図形の名前を返す。"円" | "正方形" | "長方形"
//     例: shapeName({ kind: "circle", radius: 1 }) → "円"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Shape 型を使い、kind で場合を分ける。

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

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
