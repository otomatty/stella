// 問4 円なら true
//     例: isRound({ kind: "circle", radius: 1 }) → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Shape 型を使い、kind で場合を分ける。

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; width: number; height: number };

export function isRound() {}
