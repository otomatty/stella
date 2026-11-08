// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Direction = "up" | "down" | "left" | "right";

// 問2
export function parseDirection(text: string): Direction | undefined {
  const value = text.trim().toLowerCase();
  if (value === "up" || value === "down" || value === "left" || value === "right") {
    return value;
  }
  return undefined;
}
