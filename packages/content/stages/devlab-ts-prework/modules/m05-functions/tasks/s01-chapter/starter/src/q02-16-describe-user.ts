// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value
//
// 引数と戻り値には型注釈を付けること。
// 何も返さない関数の戻り値の型は void。引数で受け取った配列やオブジェクトを書き換える関数は、引数を readonly にしない。
// 配列やオブジェクトは参照渡しなので、関数の中で書き換えると、呼び出し側の値も変わる。

// 問16 { name, age } を「山田（30歳）」にする
//     例: describeUser({ name: "山田", age: 30 }) → "山田（30歳）"
export function describeUser() {}
