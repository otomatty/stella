// 問19 values に負の数があれば AggregateError を投げる。errors は負の数ごとの RangeError(`${n} は負の数です`) の配列、message は "負の数があります"
//     例: validateAll([1, -2]) → AggregateError を投げる
// 引数と戻り値に型注釈を付けます。
export function validateAll() {}
