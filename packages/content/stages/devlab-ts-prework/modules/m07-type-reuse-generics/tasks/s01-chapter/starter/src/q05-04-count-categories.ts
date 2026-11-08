// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Category = "food" | "drink" | "other";

// 問4 カテゴリの配列から、それぞれの数を Record<Category, number> で返す（出てこないカテゴリは 0）
//     例: countCategories(["food", "food", "drink"]) → { food: 2, drink: 1, other: 0 }
export function countCategories() {}
