// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 関数を受け取る引数の型は (n: number) => number のように書く。
// 中では map、filter、find、some、every、reduce などを使わず、for-of や for で回して、受け取った関数を自分で呼ぶこと。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 それぞれの要素に fn を当てはめた配列を返す
//     例: mapNumbers([1, 2], (n) => n * 10) → [10, 20]
export function mapNumbers() {}

// 問2 predicate が true の要素だけを集める
//     例: filterNumbers([1, 2, 3, 4], (n) => n % 2 === 0) → [2, 4]
export function filterNumbers() {}

// 問3 それぞれの要素と番号を fn に渡して呼ぶ。何も返さない
//     例: eachWithIndex(["a", "b"], fn) → fn("a", 0)、fn("b", 1) の順に呼ぶ
export function eachWithIndex() {}

// 問4 predicate が true の要素の数
//     例: countWhere(["a", "bb"], (s) => s.length > 1) → 1
export function countWhere() {}

// 問5 predicate が true になる要素が1つでもあれば true
//     例: someMatch([1, 3], (n) => n > 2) → true
export function someMatch() {}

// 問6 すべての要素で predicate が true なら true。空の配列は true
//     例: everyMatch([2, 4], (n) => n % 2 === 0) → true
export function everyMatch() {}

// 問7 predicate が true になる最初の要素。なければ undefined
//     例: findNumber([1, 5, 8], (n) => n > 4) → 5
export function findNumber() {}

// 問8 predicate が true になる最初の要素の番号。なければ -1
//     例: findIndexWhere(["a", "bb"], (s) => s.length === 2) → 1
export function findIndexWhere() {}

// 問9 fn を n 回呼ぶ。fn には 0 から数えた回数を渡す。何も返さない
//     例: times(3, fn) → fn(0)、fn(1)、fn(2)
export function times() {}

// 問10 initial から始めて、fn(ここまでの値, 要素) で1つの値にまとめる
//     例: reduceNumbers([1, 2, 3], (acc, n) => acc + n, 0) → 6
export function reduceNumbers() {}

// 問11 それぞれの文字列に fn を当てはめた配列を返す
//     例: mapStrings(["a"], (s) => s.toUpperCase()) → ["A"]
export function mapStrings() {}

// 問12 x に fn を2回当てはめる（fn(fn(x))）
//     例: applyTwice((n) => n + 3, 1) → 7
export function applyTwice() {}

// 問13 それぞれの単語に fn を当てはめた数の合計
//     例: sumBy(["a", "bcd"], (w) => w.length) → 4
export function sumBy() {}

// 問14 fn の値がいちばん大きい単語を返す。同じなら先の方。空なら undefined
//     例: maxBy(["a", "bcd", "ef"], (w) => w.length) → "bcd"
export function maxBy() {}

// 問15 key の値の小さい順に並べた新しい配列を返す（同じなら元の順）。[...words].sort を使ってよい
//     例: sortByKey(["ccc", "a", "bb"], (w) => w.length) → ["a", "bb", "ccc"]
export function sortByKey() {}

// 問16 predicate が true の要素を除いた配列を返す
//     例: rejectNumbers([1, 2, 3], (n) => n === 2) → [1, 3]
export function rejectNumbers() {}

// 問17 predicate が true の要素と false の要素に分け、[true の配列, false の配列] を返す
//     例: splitBy([1, 2, 3], (n) => n > 1) → [[2, 3], [1]]
export function splitBy() {}

// 問18 log の末尾に "call(x)" を足してから、fn(x) の結果を返す
//     例: withLog(log, (n) => n * 2, 5) → 10（log に "call(5)" が足される）
export function withLog() {}

// 問19 fn が true を返すまで、最大 times 回呼ぶ。fn には1から数えた回数を渡す。成功すれば true、すべて失敗すれば false
//     例: retry(3, (attempt) => attempt === 2) → true
export function retry() {}

// 問20 x に f を当てはめ、その結果に g を当てはめる（g(f(x))）
//     例: composeTwo((n) => n + 1, (n) => n * 10, 2) → 30
export function composeTwo() {}
