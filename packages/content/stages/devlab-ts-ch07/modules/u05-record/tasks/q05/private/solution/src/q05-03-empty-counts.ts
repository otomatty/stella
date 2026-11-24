// 問3 すべてのカテゴリが 0 の Record<Category, number> を返す
//     例: emptyCounts() → { food: 0, drink: 0, other: 0 }
// 戻り値に型注釈を付けます。

export type Category = "food" | "drink" | "other";

export function emptyCounts(): Record<Category, number> {
  return { food: 0, drink: 0, other: 0 };
}
