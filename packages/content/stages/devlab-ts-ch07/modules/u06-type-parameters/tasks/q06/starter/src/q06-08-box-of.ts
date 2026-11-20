// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// 型変数（<T> など）を使って書いてください。any や unknown で逃げないこと。
// テストは、数値の配列を渡せば number、文字列の配列を渡せば string のように、渡した型に合わせて戻り値の型が変わるかを確かめます。
// 引数の配列は readonly T[] にする。

// 問8 型 Box<T>（{ value: T }）を定義して export し、boxOf(value) で Box を作る
//     例: boxOf(5) → { value: 5 }
// ここに型 Box と関数 boxOf を書く
