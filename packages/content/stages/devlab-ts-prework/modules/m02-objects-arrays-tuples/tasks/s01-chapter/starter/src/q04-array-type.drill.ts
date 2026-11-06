// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 引数の配列は、関数の中で書き換えないので readonly number[] や readonly string[] にする。戻り値の配列は number[] などでよい。
// for-of、map、filter、includes、indexOf、join、every などを使う。
// 配列の要素を numbers[0] のように取り出すと、型は number | undefined になる（要素がないかもしれないため）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 合計を返す。空の配列なら 0
//     例: sumAll([1, 2, 3]) → 6
export function sumAll() {}

// 問2 要素の数を返す
//     例: countItems(["a", "b"]) → 2
export function countItems() {}

// 問3 最初の要素を返す。空の配列なら 0
//     例: firstOrZero([5, 6]) → 5
export function firstOrZero() {}

// 問4 最後の要素を返す。空の配列なら undefined
//     例: lastItem(["a", "b", "c"]) → "c"
export function lastItem() {}

// 問5 すべての要素を2倍にした新しい配列を返す
//     例: doubleEach([1, 2, 3]) → [2, 4, 6]
export function doubleEach() {}

// 問6 それぞれの文字列の文字数を並べた配列を返す
//     例: lengths(["a", "bcd"]) → [1, 3]
export function lengths() {}

// 問7 偶数だけを集めた配列を返す
//     例: evens([1, 2, 3, 4]) → [2, 4]
export function evens() {}

// 問8 min 文字以上の単語だけを集めた配列を返す
//     例: longWords(["a", "abc", "abcd"], 3) → ["abc", "abcd"]
export function longWords() {}

// 問9 target が含まれていれば true
//     例: containsItem(["a", "b"], "b") → true
export function containsItem() {}

// 問10 target が何番目（0から数える）にあるかを返す。なければ -1
//     例: positionOf(["a", "b"], "b") → 1
export function positionOf() {}

// 問11 要素を「, 」でつないだ文字列を返す
//     例: joinWithComma(["a", "b", "c"]) → "a, b, c"
export function joinWithComma() {}

// 問12 最大値を返す。空の配列なら Error を投げる
//     例: maxValue([3, 9, 2]) → 9
export function maxValue() {}

// 問13 最小値を返す。空の配列なら Error を投げる
//     例: minValue([3, 9, 2]) → 2
export function minValue() {}

// 問14 平均を返す。空の配列なら 0
//     例: averageOf([2, 4, 9]) → 5
export function averageOf() {}

// 問15 すべての英字を大文字にした配列を返す
//     例: upperAll(["a", "Bc"]) → ["A", "BC"]
export function upperAll() {}

// 問16 0より大きい要素の数を返す
//     例: countPositive([3, -1, 0, 5]) → 2
export function countPositive() {}

// 問17 start 以上 end 未満の整数を順に並べた配列を返す（for 文と push）
//     例: range(2, 5) → [2, 3, 4]
export function range() {}

// 問18 item を times 個並べた配列を返す
//     例: repeatItem("x", 3) → ["x", "x", "x"]
export function repeatItem() {}

// 問19 0番目、2番目、4番目…の要素だけを合計する
//     例: sumEvenIndex([1, 2, 3, 4, 5]) → 9
export function sumEvenIndex() {}

// 問20 すべての要素が0より大きければ true（every を使う）
//     例: allPositive([1, 2, 3]) → true
export function allPositive() {}
