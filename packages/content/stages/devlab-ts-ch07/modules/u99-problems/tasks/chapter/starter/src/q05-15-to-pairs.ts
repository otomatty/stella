// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

// 問15 Record<string, number> を [キー, 値] の配列にする
//     例: toPairs({ a: 1, b: 2 }) → [["a", 1], ["b", 2]]
export function toPairs() {}
