// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問4
export function countCategories(categories: readonly Category[]): Record<Category, number> {
  const counts: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const category of categories) {
    counts[category]++;
  }
  return counts;
}
