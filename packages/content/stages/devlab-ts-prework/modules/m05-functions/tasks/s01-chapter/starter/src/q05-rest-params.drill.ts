// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// いくつでも受け取れる引数は ...numbers: number[] のように書く（残余引数）。残余引数は最後の引数にしか書けない。
// 「1つ以上」の問題は、1つ目を普通の引数にし、残りを残余引数にする（引数なしの呼び出しが型エラーになる）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 すべての数の合計。引数がなければ 0
//     例: total(1, 2, 3) → 6
export function total() {}

// 問2 1つ以上の数の最大値
//     例: largest(3, 9, 2) → 9
export function largest() {}

// 問3 1つ以上の数の最小値
//     例: smallest(3, 9, 2) → 2
export function smallest() {}

// 問4 すべての文字列をつなぐ
//     例: concatAll("a", "b", "c") → "abc"
export function concatAll() {}

// 問5 渡された引数の数を返す（型は何でもよいので unknown[]）
//     例: countArgs(1, "a", null) → 3
export function countArgs() {}

// 問6 1つ目の引数 separator で、残りの単語をつなぐ
//     例: joinWords("-", "a", "b", "c") → "a-b-c"
export function joinWords() {}

// 問7 すべての数の平均。引数がなければ 0
//     例: averageAll(2, 4, 9) → 5
export function averageAll() {}

// 問8 すべて true なら true。引数がなければ true
//     例: allTrue(true, false) → false
export function allTrue() {}

// 問9 1つでも true なら true。引数がなければ false
//     例: anyTrue(false, true) → true
export function anyTrue() {}

// 問10 空でない部品だけを「/」でつなぐ
//     例: pathOf("users", "", "42") → "users/42"
export function pathOf() {}

// 問11 すべての数を掛ける。引数がなければ 1
//     例: multiplyAll(2, 3, 4) → 24
export function multiplyAll() {}

// 問12 undefined でない最初の値を返す。なければ undefined
//     例: firstDefined(undefined, "a", "b") → "a"
export function firstDefined() {}

// 問13 1つ目の引数 label に続けて、残りを「, 」でつなぐ。「[label] a, b」の形。残りがなければ「[label]」
//     例: labeled("todo", "買い物", "掃除") → "[todo] 買い物, 掃除"
export function labeled() {}

// 問14 いちばん長い文字列を返す。同じ長さなら先の方。引数がなければ空の文字列
//     例: longestOf("a", "abc", "ab") → "abc"
export function longestOf() {}

// 問15 1つ目の引数 target が、残りの中にいくつあるかを返す
//     例: countOf("a", "a", "b", "a") → 2
export function countOf() {}

// 問16 target の末尾に残りの数をすべて足し、足した後の長さを返す
//     例: pushAll([0], 1, 2) → 3
export function pushAll() {}

// 問17 配列をスプレッド構文で Math.max に渡して、最大値を返す。空の配列なら Error を投げる
//     例: maxOfArray([3, 9, 2]) → 9
export function maxOfArray() {}

// 問18 いくつかの配列を受け取り、1つにつないだ配列を返す
//     例: mergeArrays([1, 2], [3], []) → [1, 2, 3]
export function mergeArrays() {}

// 問19 1つ目の引数 prefix を、残りのそれぞれの前に付けた配列を返す
//     例: withPrefix("#", "a", "b") → ["#a", "#b"]
export function withPrefix() {}

// 問20 重複を除いた配列を返す。順番は最初に出てきた順
//     例: uniqueOf("a", "b", "a") → ["a", "b"]
export function uniqueOf() {}
