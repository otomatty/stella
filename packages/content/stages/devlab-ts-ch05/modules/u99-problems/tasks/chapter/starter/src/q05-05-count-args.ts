// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters
//
// 引数と戻り値には型注釈を付けること。
// いくつでも受け取れる引数は ...numbers: number[] のように書く（残余引数）。残余引数は最後の引数にしか書けない。
// 「1つ以上」の問題は、1つ目を普通の引数にし、残りを残余引数にする（引数なしの呼び出しが型エラーになる）。

// 問5 渡された引数の数を返す（型は何でもよいので unknown[]）
//     例: countArgs(1, "a", null) → 3
export function countArgs() {}
