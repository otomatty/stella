// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Category = "food" | "drink" | "other";

// 問3 すべてのカテゴリが 0 の Record<Category, number> を返す
//     例: emptyCounts() → { food: 0, drink: 0, other: 0 }
export function emptyCounts() {}
