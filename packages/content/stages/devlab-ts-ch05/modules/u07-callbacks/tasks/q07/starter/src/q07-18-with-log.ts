// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を受け取る引数の型は (n: number) => number のように書く。
// 中では map、filter、find、some、every、reduce などを使わず、for-of や for で回して、受け取った関数を自分で呼ぶこと。

// 問18 log の末尾に "call(x)" を足してから、fn(x) の結果を返す
//     例: withLog(log, (n) => n * 2, 5) → 10（log に "call(5)" が足される）
export function withLog() {}
