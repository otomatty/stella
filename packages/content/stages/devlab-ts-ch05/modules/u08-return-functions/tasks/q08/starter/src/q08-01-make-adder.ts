// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問1 受け取った数に n を足す関数を返す
//     例: makeAdder(3)(4) → 7
export function makeAdder() {}
