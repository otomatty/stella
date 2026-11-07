// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// 型変数（<T> など）を使って書いてください。any や unknown で逃げないこと。
// テストは、数値の配列を渡せば number、文字列の配列を渡せば string のように、渡した型に合わせて戻り値の型が変わるかを確かめます。
// 引数の配列は readonly T[] にする。

// 問20 item が含まれていれば除き、なければ末尾に足した新しい配列
//     例: toggleItem(["a", "b"], "a") → ["b"]
export function toggleItem() {}
