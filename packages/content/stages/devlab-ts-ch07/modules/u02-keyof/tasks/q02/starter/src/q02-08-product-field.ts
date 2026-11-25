// 問8 product の key のプロパティを返す。key の型は keyof Product、戻り値は string | number
//     例: productField(product, "price") → 150
// 引数と戻り値に型注釈を付けます。

export type Product = { code: string; price: number; stock: number };

export function productField() {}
