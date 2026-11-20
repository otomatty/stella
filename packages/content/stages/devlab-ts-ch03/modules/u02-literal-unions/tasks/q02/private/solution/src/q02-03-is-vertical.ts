// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Direction = "up" | "down" | "left" | "right";

// 問3
export function isVertical(direction: Direction): boolean {
  return direction === "up" || direction === "down";
}
