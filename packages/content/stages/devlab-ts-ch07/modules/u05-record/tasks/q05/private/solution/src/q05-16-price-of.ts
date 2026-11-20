// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問16
export function priceOf(prices: Record<Category, number>, category: Category): number {
  return prices[category];
}
