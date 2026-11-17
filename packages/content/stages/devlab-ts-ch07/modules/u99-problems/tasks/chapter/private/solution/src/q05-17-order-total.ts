// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問17
export function orderTotal(
  prices: Record<Category, number>,
  order: Partial<Record<Category, number>>,
): number {
  const categories: Category[] = ["food", "drink", "other"];
  let total = 0;
  for (const category of categories) {
    total += prices[category] * (order[category] ?? 0);
  }
  return total;
}
