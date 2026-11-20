// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters
//
// 引数と戻り値には型注釈を付けること。
// いくつでも受け取れる引数は ...numbers: number[] のように書く（残余引数）。残余引数は最後の引数にしか書けない。
// 「1つ以上」の問題は、1つ目を普通の引数にし、残りを残余引数にする（引数なしの呼び出しが型エラーになる）。

// 問13 1つ目の引数 label に続けて、残りを「, 」でつなぐ。「[label] a, b」の形。残りがなければ「[label]」
//     例: labeled("todo", "買い物", "掃除") → "[todo] 買い物, 掃除"
export function labeled() {}
