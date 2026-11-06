// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 引数の配列は readonly にし、元の配列を書き換えずに、新しい配列を作って返す。
// [...items, item]、slice、filter、map を使う。sort や reverse は元の配列を書き換えるので、[...items] でコピーしてから使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 末尾に item を足した新しい配列を返す
//     例: append(["a", "b"], "c") → ["a", "b", "c"]
export function append() {}

// 問2 先頭に item を足した新しい配列を返す
//     例: prepend(["b", "c"], "a") → ["a", "b", "c"]
export function prepend() {}

// 問3 先頭の要素を除いた新しい配列を返す
//     例: dropFirst(["a", "b", "c"]) → ["b", "c"]
export function dropFirst() {}

// 問4 最後の要素を除いた新しい配列を返す
//     例: dropLast(["a", "b", "c"]) → ["a", "b"]
export function dropLast() {}

// 問5 index 番目に item を差し込んだ新しい配列を返す
//     例: insertAt(["a", "c"], 1, "b") → ["a", "b", "c"]
export function insertAt() {}

// 問6 index 番目の要素を除いた新しい配列を返す
//     例: removeAt(["a", "b", "c"], 1) → ["a", "c"]
export function removeAt() {}

// 問7 index 番目の要素を item に置き換えた新しい配列を返す
//     例: replaceAt(["a", "b", "c"], 1, "x") → ["a", "x", "c"]
export function replaceAt() {}

// 問8 小さい順に並べた新しい配列を返す
//     例: sortAsc([3, 1, 2]) → [1, 2, 3]
export function sortAsc() {}

// 問9 大きい順に並べた新しい配列を返す
//     例: sortDesc([3, 1, 2]) → [3, 2, 1]
export function sortDesc() {}

// 問10 辞書順に並べた新しい配列を返す
//     例: sortWords(["b", "c", "a"]) → ["a", "b", "c"]
export function sortWords() {}

// 問11 逆順に並べた新しい配列を返す
//     例: reversed(["a", "b", "c"]) → ["c", "b", "a"]
export function reversed() {}

// 問12 2つの配列をつないだ新しい配列を返す
//     例: concatBoth([1, 2], [3]) → [1, 2, 3]
export function concatBoth() {}

// 問13 value と同じ要素をすべて除いた新しい配列を返す
//     例: without(["a", "b", "a"], "a") → ["b"]
export function without() {}

// 問14 重複を除いた新しい配列を返す。順番は最初に出てきた順
//     例: uniqueNumbers([3, 1, 3, 2, 1]) → [3, 1, 2]
export function uniqueNumbers() {}

// 問15 index 番目の要素を先頭に移した新しい配列を返す
//     例: moveToFront(["a", "b", "c"], 2) → ["c", "a", "b"]
export function moveToFront() {}

// 問16 i 番目と j 番目を入れ替えた新しい配列を返す。どちらかが範囲外なら Error を投げる
//     例: swapItems(["a", "b", "c"], 0, 2) → ["c", "b", "a"]
export function swapItems() {}

// 問17 先頭から n 個の要素の新しい配列を返す
//     例: take([1, 2, 3, 4], 2) → [1, 2]
export function take() {}

// 問18 先頭の n 個を除いた新しい配列を返す
//     例: skip([1, 2, 3, 4], 2) → [3, 4]
export function skip() {}

// 問19 value を length 個並べた新しい配列を返す
//     例: filled(3, 0) → [0, 0, 0]
export function filled() {}

// 問20 index 番目の要素だけを1増やした新しい配列を返す
//     例: incrementAt([1, 1, 1], 1) → [1, 2, 1]
export function incrementAt() {}
