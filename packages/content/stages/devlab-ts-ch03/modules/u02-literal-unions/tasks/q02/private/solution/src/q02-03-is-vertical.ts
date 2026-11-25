// 問3 up か down なら true
//     例: isVertical("down") → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Direction 型を使う。

export type Direction = "up" | "down" | "left" | "right";

export function isVertical(direction: Direction): boolean {
  return direction === "up" || direction === "down";
}
