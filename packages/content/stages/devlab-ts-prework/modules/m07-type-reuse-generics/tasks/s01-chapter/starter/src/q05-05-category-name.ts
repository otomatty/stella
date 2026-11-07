// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Category = "food" | "drink" | "other";

// 問5 定数 CATEGORY_NAMES を Record<Category, string> として宣言して export し（food は "食べ物"、drink は "飲み物"、other は "その他"）、categoryName(category) でその名前を返す
//     例: categoryName("drink") → "飲み物"
// ここに CATEGORY_NAMES と関数 categoryName を書く
