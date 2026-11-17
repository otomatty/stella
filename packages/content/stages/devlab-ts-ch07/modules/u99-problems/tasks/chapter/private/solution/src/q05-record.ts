export type Category = "food" | "drink" | "other";
export type Item = { name: string; category: Category; price: number };

export function countByCategory(items: readonly Item[]): Record<Category, number> {
  const counts: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const item of items) {
    counts[item.category]++;
  }
  return counts;
}

export function totalByCategory(items: readonly Item[]): Record<Category, number> {
  const totals: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const item of items) {
    totals[item.category] += item.price;
  }
  return totals;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "食べ物",
  drink: "飲み物",
  other: "その他",
};

export function indexByName(items: readonly Item[]): Record<string, Item> {
  const index: Record<string, Item> = {};
  for (const item of items) {
    index[item.name] = item;
  }
  return index;
}
