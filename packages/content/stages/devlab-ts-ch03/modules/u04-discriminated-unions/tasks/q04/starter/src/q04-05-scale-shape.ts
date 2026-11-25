// 問5 大きさを k 倍した、新しい図形を返す
//     例: scaleShape({ kind: "square", size: 3 }, 2) → { kind: "square", size: 6 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Shape 型を使い、kind で場合を分ける。

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export function scaleShape() {}
