// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問3
export function emptyCounts(): Record<Category, number> {
  return { food: 0, drink: 0, other: 0 };
}
