// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

// 問9 Record<string, number> の得点表から、最高得点の人を返す。同点なら先に出てきた人。空なら undefined
//     例: topScorer({ 山田: 70, 佐藤: 90 }) → "佐藤"
export function topScorer() {}
