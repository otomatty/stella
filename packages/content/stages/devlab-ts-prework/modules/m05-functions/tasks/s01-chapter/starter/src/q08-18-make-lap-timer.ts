// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を返す関数の戻り値の型は (x: number) => number のように書く。
// 返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

// 問18 時刻 t（ミリ秒）を受け取り、前回呼んだときの t との差を返す関数を返す。1回目は t をそのまま返す
//     例: const lap = makeLapTimer(); lap(1000) → 1000、lap(1500) → 500
export function makeLapTimer() {}
