// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 引数と戻り値には型注釈を付けること。
// 関数を受け取る引数の型は (n: number) => number のように書く。
// 中では map、filter、find、some、every、reduce などを使わず、for-of や for で回して、受け取った関数を自分で呼ぶこと。

// 問19 fn が true を返すまで、最大 times 回呼ぶ。fn には1から数えた回数を渡す。成功すれば true、すべて失敗すれば false
//     例: retry(3, (attempt) => attempt === 2) → true
export function retry() {}
