// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。次の20個の関数を、型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 keyFn(要素) が返す文字列ごとにまとめる。戻り値は Record<string, T[]>
//     例: groupItems(["ab", "c", "de"], (s) => String(s.length)) → { "2": ["ab", "de"], "1": ["c"] }
export function groupItems() {}

// 問2 keyFn(要素) が返す文字列ごとの数。戻り値は Record<string, number>
//     例: countItems([1, 2, 3], (n) => (n % 2 === 0 ? "偶数" : "奇数")) → { 奇数: 2, 偶数: 1 }
export function countItems() {}

// 問3 predicate が true の配列と false の配列に分ける。戻り値は [T[], T[]]
//     例: splitBy([1, 2, 3], (n) => n > 1) → [[2, 3], [1]]
export function splitBy() {}

// 問4 keyFn(要素) が同じものは最初の1つだけ残す。keyFn は string か number を返す
//     例: uniqueByKey(["ab", "cd", "e"], (s) => s.length) → ["ab", "e"]
export function uniqueByKey() {}

// 問5 keyFn(要素) の数値の小さい順に並べた新しい配列（同じなら元の順）
//     例: sortByKey([{ n: 2 }, { n: 1 }], (x) => x.n) → [{ n: 1 }, { n: 2 }]
export function sortByKey() {}

// 問6 size 個ずつに区切る。size が 1 未満なら Error を投げる
//     例: chunked(["a", "b", "c"], 2) → [["a", "b"], ["c"]]
export function chunked() {}

// 問7 2つの配列の同じ番号どうしを fn で組み合わせた配列。長さは短い方に合わせる（型変数を3つ使う）
//     例: zipWith([1, 2], ["a", "b"], (n, s) => `${s}${n}`) → ["a1", "b2"]
export function zipWith() {}

// 問8 配列の配列を1つの配列にする
//     例: flattenOnce([[1], [2, 3]]) → [1, 2, 3]
export function flattenOnce() {}

// 問9 null と undefined を除いた配列。戻り値の型からも null と undefined が消える
//     例: compact([1, null, 2, undefined]) → [1, 2]
export function compact() {}

// 問10 keyFn(要素) をキーにした Record<string, T>（同じキーは後の方）
//     例: indexBy([{ code: "A" }], (x) => x.code) → { A: { code: "A" } }
export function indexBy() {}

// 問11 Record<string, T> のすべての値に fn を当てはめた Record<string, U>（型変数を2つ使う）
//     例: mapValues({ a: 1, b: 2 }, (n) => String(n)) → { a: "1", b: "2" }
export function mapValues() {}

// 問12 末尾の n 個の新しい配列。n が 0 以下なら空の配列
//     例: lastN([1, 2, 3], 2) → [2, 3]
export function lastN() {}

// 問13 a にあって b にない要素（a の順）
//     例: difference([1, 2, 3], [2]) → [1, 3]
export function difference() {}

// 問14 a と b の両方にある要素（a の順。重複は1つにする）
//     例: intersection([1, 2, 2, 3], [2, 3, 4]) → [2, 3]
export function intersection() {}

// 問15 a と b のどちらかにある要素を、出てきた順に重複なく並べる
//     例: union([1, 2], [2, 3]) → [1, 2, 3]
export function union() {}

// 問16 先頭から、predicate が true のあいだの要素を集める（false が出たら止める）
//     例: takeWhile([1, 2, 5, 1], (n) => n < 3) → [1, 2]
export function takeWhile() {}

// 問17 先頭から、predicate が true のあいだの要素を飛ばし、残りを返す
//     例: dropWhile([1, 2, 5, 1], (n) => n < 3) → [5, 1]
export function dropWhile() {}

// 問18 predicate が true の最後の要素。なければ undefined（後ろから for 文で探す）
//     例: findLastItem([1, 4, 6, 7], (n) => n % 2 === 0) → 6
export function findLastItem() {}

// 問19 fn(要素) の合計
//     例: sumOf([{ p: 100 }, { p: 50 }], (x) => x.p) → 150
export function sumOf() {}

// 問20 fn の値がいちばん小さい要素。同じなら先の方。空なら undefined
//     例: minBy(["abc", "a", "b"], (s) => s.length) → "a"
export function minBy() {}
