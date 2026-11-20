// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問13 { square, computed } を返す。square(n) は n × n を返す。同じ n は2回目から計算しない。computed() は実際に計算した回数を返す
//     例: const c = makeSquareCache(); c.square(3); c.square(3); c.computed() → 1
export function makeSquareCache() {}
