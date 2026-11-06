// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// 次の20問を、型変数（<T> など）を使って書いてください。any や unknown で逃げないこと。
// テストは、数値の配列を渡せば number、文字列の配列を渡せば string のように、渡した型に合わせて戻り値の型が変わるかを確かめます。
// 引数の配列は readonly T[] にする。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 受け取った値をそのまま返す
//     例: identity(5) → 5
export function identity() {}

// 問2 最初の要素を返す。空なら undefined
//     例: firstOf([3, 1]) → 3
export function firstOf() {}

// 問3 最後の要素を返す。空なら undefined
//     例: lastOf(["a", "b"]) → "b"
export function lastOf() {}

// 問4 値を1つだけ持つ配列にする
//     例: wrapInArray("a") → ["a"]
export function wrapInArray() {}

// 問5 value を times 個並べた配列
//     例: repeatValue("x", 3) → ["x", "x", "x"]
export function repeatValue() {}

// 問6 2つの値を [a, b] のタプルにする（型変数を2つ使う）
//     例: makePair("a", 1) → ["a", 1]
export function makePair() {}

// 問7 タプル [a, b] を [b, a] にする
//     例: swapPair(["a", 1]) → [1, "a"]
export function swapPair() {}

// 問8 型 Box<T>（{ value: T }）を定義して export し、boxOf(value) で Box を作る
//     例: boxOf(5) → { value: 5 }
// ここに型 Box と関数 boxOf を書く

// 問9 { value: T } から value を取り出す
//     例: unboxed({ value: "a" }) → "a"
export function unboxed() {}

// 問10 逆順にした新しい配列（元は変えない）
//     例: reversedCopy([1, 2, 3]) → [3, 2, 1]
export function reversedCopy() {}

// 問11 index 番目の要素を返す。負の数なら後ろから数える（-1 が最後）。範囲外なら undefined
//     例: nth(["a", "b", "c"], -1) → "c"
export function nth() {}

// 問12 先頭から n 個の新しい配列
//     例: takeFirst([1, 2, 3], 2) → [1, 2]
export function takeFirst() {}

// 問13 target と同じ要素の数（=== で比べる）
//     例: countOf(["a", "b", "a"], "a") → 2
export function countOf() {}

// 問14 value が含まれていれば true
//     例: includesValue([1, 2], 2) → true
export function includesValue() {}

// 問15 value と同じ要素をすべて除いた新しい配列
//     例: withoutValue([1, 2, 1], 1) → [2]
export function withoutValue() {}

// 問16 value が最後に出てくる番号。なければ -1
//     例: lastIndexOfValue(["a", "b", "a"], "a") → 2
export function lastIndexOfValue() {}

// 問17 value を length 個並べた新しい配列
//     例: filledWith(3, 0) → [0, 0, 0]
export function filledWith() {}

// 問18 型 Maybe<T>（T | null）を定義して export し、orElse(value, fallback) で null なら fallback を返す
//     例: orElse(null, 5) → 5
// ここに型 Maybe と関数 orElse を書く

// 問19 2つの配列の同じ番号どうしを [a, b] のタプルにした配列。長さは短い方に合わせる
//     例: zip([1, 2], ["a", "b", "c"]) → [[1, "a"], [2, "b"]]
export function zip() {}

// 問20 item が含まれていれば除き、なければ末尾に足した新しい配列
//     例: toggleItem(["a", "b"], "a") → ["b"]
export function toggleItem() {}
