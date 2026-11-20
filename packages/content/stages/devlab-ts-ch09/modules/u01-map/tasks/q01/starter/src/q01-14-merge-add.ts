// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map
//
// Map を使って書いてください。引数と戻り値には型注釈を付けること（Map<string, number> など）。
// 「新しい Map を返す」問題では、引数の Map を変えないこと。引数の型は Map<…> と書く（ReadonlyMap は使わない）。
// Map は、入れた順を覚えています。keys()、values()、entries() は入れた順に取り出せる。
// 配列にしたいときは [...map.keys()] のようにスプレッド構文を使う。

// 問14 2つの Map をまとめた新しい Map を返す。同じキーは値を足す（a のキーを a の順に、その後に b にだけあるキー）
//     例: mergeAdd(Map { "x" => 1 }, Map { "x" => 2, "y" => 3 }) → Map { "x" => 3, "y" => 3 }
export function mergeAdd() {}
