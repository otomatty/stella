// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint
//
// 型変数を使って書いてください。any や unknown で逃げないこと。
// <T extends { length: number }> は「length を持つ型だけ」、<K extends keyof T> は「T のプロパティ名だけ」、<T extends object> は「オブジェクトだけ」に限る書き方（制約）。
// テストは、制約に合わない呼び出しが型エラーになることも確かめます。

// 問7 obj の key だけを value にした新しいオブジェクト。value の型は T[K]（そのプロパティの型）に限る
//     例: setProp({ name: "山田", age: 30 }, "age", 31) → { name: "山田", age: 31 }
export function setProp() {}
