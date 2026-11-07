// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問5
export const CATEGORY_NAMES: Record<Category, string> = {
  food: "食べ物",
  drink: "飲み物",
  other: "その他",
};

export function categoryName(category: Category): string {
  return CATEGORY_NAMES[category];
}
