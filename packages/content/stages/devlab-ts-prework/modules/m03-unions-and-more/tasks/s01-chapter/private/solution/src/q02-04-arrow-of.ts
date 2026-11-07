// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Direction = "up" | "down" | "left" | "right";

// 問4
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
