// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters
//
// 引数と戻り値には型注釈を付けること。
// いくつでも受け取れる引数は ...numbers: number[] のように書く（残余引数）。残余引数は最後の引数にしか書けない。
// 「1つ以上」の問題は、1つ目を普通の引数にし、残りを残余引数にする（引数なしの呼び出しが型エラーになる）。

// 問19 1つ目の引数 prefix を、残りのそれぞれの前に付けた配列を返す
//     例: withPrefix("#", "a", "b") → ["#a", "#b"]
export function withPrefix() {}
