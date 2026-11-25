// 問4 カテゴリの配列から、それぞれの数を Record<Category, number> で返す（出てこないカテゴリは 0）
//     例: countCategories(["food", "food", "drink"]) → { food: 2, drink: 1, other: 0 }
// 引数と戻り値に型注釈を付けます。

export type Category = "food" | "drink" | "other";

export function countCategories(categories: readonly Category[]): Record<Category, number> {
  const counts: Record<Category, number> = { food: 0, drink: 0, other: 0 };
  for (const category of categories) {
    counts[category]++;
  }
  return counts;
}
