// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint
//
// 型変数を使って書いてください。any や unknown で逃げないこと。
// <T extends { length: number }> は「length を持つ型だけ」、<K extends keyof T> は「T のプロパティ名だけ」、<T extends object> は「オブジェクトだけ」に限る書き方（制約）。
// テストは、制約に合わない呼び出しが型エラーになることも確かめます。

// 問19 keyFn(要素) が返すキーごとの数。キーの型は文字列に限る（K extends string）。戻り値は Partial<Record<K, number>>
//     例: countByKey(["apple", "avocado", "banana"], (w) => w.slice(0, 1)) → { a: 2, b: 1 }
export function countByKey() {}
