// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Category = "food" | "drink" | "other";

// 問17 価格表 Record<Category, number> と、注文 Partial<Record<Category, number>>（カテゴリごとの個数。ないカテゴリは 0 個）から合計金額を返す
//     例: orderTotal({ food: 300, drink: 150, other: 500 }, { food: 2 }) → 600
export function orderTotal() {}
