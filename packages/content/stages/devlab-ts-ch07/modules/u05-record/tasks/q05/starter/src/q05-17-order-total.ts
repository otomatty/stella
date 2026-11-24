// 問17 価格表 Record<Category, number> と、注文 Partial<Record<Category, number>>（カテゴリごとの個数。ないカテゴリは 0 個）から合計金額を返す
//     例: orderTotal({ food: 300, drink: 150, other: 500 }, { food: 2 }) → 600
// 引数と戻り値に型注釈を付けます。

export type Category = "food" | "drink" | "other";

export function orderTotal() {}
