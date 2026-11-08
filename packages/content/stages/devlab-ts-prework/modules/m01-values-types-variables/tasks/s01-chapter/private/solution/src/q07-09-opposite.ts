// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問9
export function opposite(
  direction: "north" | "south" | "east" | "west",
): "north" | "south" | "east" | "west" {
  if (direction === "north") {
    return "south";
  }
  if (direction === "south") {
    return "north";
  }
  if (direction === "east") {
    return "west";
  }
  return "east";
}
