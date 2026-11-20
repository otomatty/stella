// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint
//
// 型変数を使って書いてください。any や unknown で逃げないこと。
// <T extends { length: number }> は「length を持つ型だけ」、<K extends keyof T> は「T のプロパティ名だけ」、<T extends object> は「オブジェクトだけ」に限る書き方（制約）。
// テストは、制約に合わない呼び出しが型エラーになることも確かめます。

// 問10 name プロパティを持つものに限り、name の辞書順に並べた新しい配列を返す（localeCompare を使う）
//     例: sortByName([{ name: "b" }, { name: "a" }]) → [{ name: "a" }, { name: "b" }]
export function sortByName() {}
