// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map
//
// Map を使って書いてください。引数と戻り値には型注釈を付けること（Map<string, number> など）。
// 「新しい Map を返す」問題では、引数の Map を変えないこと。引数の型は Map<…> と書く（ReadonlyMap は使わない）。
// Map は、入れた順を覚えています。keys()、values()、entries() は入れた順に取り出せる。
// 配列にしたいときは [...map.keys()] のようにスプレッド構文を使う。

// 問12 単語を、最初の1文字ごとにまとめた Map を返す（キーは最初に出てきた順、中の配列は元の順）
//     例: groupByInitial(["apple", "banana", "avocado"]) → Map { "a" => ["apple", "avocado"], "b" => ["banana"] }
export function groupByInitial() {}
