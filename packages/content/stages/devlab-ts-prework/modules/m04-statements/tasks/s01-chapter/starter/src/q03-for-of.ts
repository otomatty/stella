// 04-q03 for文と for-of文
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/
//
// 問題
// 次の3つの関数を、for 文か for-of 文を使って書いてください。引数と戻り値には型注釈を付けること。
//
// 1. chunk(items, size)
//    配列を size 個ずつに区切った配列を返す。最後の区切りは size 個より少なくてもよい。
//    引数の配列は readonly number[]、戻り値は number[][]。size が 1 未満なら Error を投げる
//    例: chunk([1, 2, 3, 4, 5], 2) → [[1, 2], [3, 4], [5]]
//
// 2. findFirstDuplicate(items)
//    2回目に出てきた要素のうち、いちばん早く出てきたものを返す。重複がなければ undefined
//    引数は readonly string[]
//    例: findFirstDuplicate(["a", "b", "c", "b", "a"]) → "b"
//
// 3. multiplicationTable(n)
//    n の段の九九を、"3 × 1 = 3" の形で 1〜9 まで並べた配列を返す

export function chunk() {}

export function findFirstDuplicate() {}

export function multiplicationTable() {}
