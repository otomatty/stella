// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array
//
// 引数と戻り値には型注釈を付けること。
// 引数の配列は readonly にし、元の配列を書き換えずに、新しい配列を作って返す。
// [...items, item]、slice、filter、map を使う。sort や reverse は元の配列を書き換えるので、[...items] でコピーしてから使う。

// 問16 i 番目と j 番目を入れ替えた新しい配列を返す。どちらかが範囲外なら Error を投げる
//     例: swapItems(["a", "b", "c"], 0, 2) → ["c", "b", "a"]
export function swapItems() {}
