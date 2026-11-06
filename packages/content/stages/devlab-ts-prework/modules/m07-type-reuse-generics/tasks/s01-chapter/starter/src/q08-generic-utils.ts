// 07-q08 ★総合問題 ジェネリクスのユーティリティ
//
// 教材: 07章のこれまでの教材
//
// 問題
// 05-q10 では生徒（Student）の配列だけに使える groupBy などを書きました。
// これを型変数を使って、どんな配列にも使えるように書き直してください。any や unknown で逃げないこと。
// 引数の配列は readonly T[] にし、元の配列は変えないこと。
//
// 1. groupBy(items, keyFn): keyFn(要素) が返す文字列ごとにまとめる。戻り値は Record<string, T[]>
// 2. countBy(items, keyFn): keyFn(要素) が返す文字列ごとに数える。戻り値は Record<string, number>
// 3. partition(items, predicate): [true の配列, false の配列] を返す。戻り値は [T[], T[]]
// 4. uniqueBy(items, keyFn): keyFn(要素) が同じものは最初の1つだけ残す。keyFn は string か number を返す
// 5. sortBy(items, keyFn): keyFn(要素) が返す数値の小さい順に並べた新しい配列。同じなら元の順
// 6. chunk(items, size): size 個ずつに区切る。戻り値は T[][]。size が 1 未満なら Error を投げる

export function groupBy() {}

export function countBy() {}

export function partition() {}

export function uniqueBy() {}

export function sortBy() {}

export function chunk() {}
