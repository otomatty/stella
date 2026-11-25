// 問4 向きを矢印にする。up は "↑"、down は "↓"、left は "←"、right は "→"
//     例: arrowOf("left") → "←"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Direction 型を使う。

export type Direction = "up" | "down" | "left" | "right";

export function arrowOf(direction: Direction): "↑" | "↓" | "←" | "→" {
  if (direction === "up") {
    return "↑";
  }
  if (direction === "down") {
    return "↓";
  }
  if (direction === "left") {
    return "←";
  }
  return "→";
}
