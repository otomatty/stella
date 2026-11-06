// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/
//
// 次の20個の関数を、for 文か for-of 文で書いてください（map や filter などは使わない）。引数と戻り値には型注釈を付けること。
// 配列の要素を順に見るだけなら for-of、番号（インデックス）も要るなら for 文が書きやすい。
// 引数の配列は readonly にする。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 合計を返す
//     例: sumArray([1, 2, 3]) → 6
export function sumArray() {}

// 問2 target と同じ要素の数を返す
//     例: countMatches(["a", "b", "a"], "a") → 2
export function countMatches() {}

// 問3 いちばん長い単語を返す。同じ長さなら先に出てきた方。空の配列なら空の文字列
//     例: longestWord(["a", "abc", "ab"]) → "abc"
export function longestWord() {}

// 問4 最大値の番号（0から数える）を返す。同じなら先の方。空の配列なら -1
//     例: indexOfMax([3, 9, 2]) → 1
export function indexOfMax() {}

// 問5 すべての要素を掛けた数を返す。空の配列なら 1
//     例: productOf([2, 3, 4]) → 24
export function productOf() {}

// 問6 逆順にした新しい配列を返す（後ろから for 文で回して push する）
//     例: reverseArray(["a", "b", "c"]) → ["c", "b", "a"]
export function reverseArray() {}

// 問7 1〜n の2乗を並べた配列を返す
//     例: squaresUpTo(4) → [1, 4, 9, 16]
export function squaresUpTo() {}

// 問8 0 以上 n 以下の偶数を並べた配列を返す（for 文で 2 ずつ増やす）
//     例: evensUpTo(7) → [0, 2, 4, 6]
export function evensUpTo() {}

// 問9 要素を「-」でつないだ文字列を返す（join を使わない）
//     例: joinWithDash(["a", "b", "c"]) → "a-b-c"
export function joinWithDash() {}

// 問10 英大文字（A〜Z）の数を返す
//     例: countUpper("TypeScript") → 2
export function countUpper() {}

// 問11 char が出てくる位置（0から数える）を並べた配列を返す
//     例: positionsOf("banana", "a") → [1, 3, 5]
export function positionsOf() {}

// 問12 文字列に含まれる数字（0〜9）の合計を返す
//     例: digitTotal("a1b2c3") → 6
export function digitTotal() {}

// 問13 最初に出てくる負の数を返す。見つかったらループを抜ける。なければ undefined
//     例: firstNegative([3, -1, -5]) → -1
export function firstNegative() {}

// 問14 すべて偶数なら true。奇数が見つかったら、その時点で false を返す
//     例: allEven([2, 4, 5]) → false
export function allEven() {}

// 問15 先頭からの累計を並べた配列を返す
//     例: runningTotal([1, 2, 3]) → [1, 3, 6]
export function runningTotal() {}

// 問16 2つの配列の同じ番号どうしを足した配列を返す。長さが違えば短い方に合わせる
//     例: zipSum([1, 2, 3], [10, 20]) → [11, 22]
export function zipSum() {}

// 問17 配列の配列を、1つの配列にする（for-of を2重にする）
//     例: flatten([[1, 2], [3], []]) → [1, 2, 3]
export function flatten() {}

// 問18 min 以上 max 以下の要素の数を返す
//     例: countInRange([1, 5, 10, 15], 5, 10) → 2
export function countInRange() {}

// 問19 重複を除いた新しい配列を返す。最初に出てきた順を保つ
//     例: dedupe(["a", "b", "a", "c", "b"]) → ["a", "b", "c"]
export function dedupe() {}

// 問20 "*" を1個、2個…n 個並べた文字列の配列を返す
//     例: stairs(3) → ["*", "**", "***"]
export function stairs() {}
