// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map
//
// Map を使って書いてください。引数と戻り値には型注釈を付けること（Map<string, number> など）。
// 「新しい Map を返す」問題では、引数の Map を変えないこと。引数の型は Map<…> と書く（ReadonlyMap は使わない）。
// Map は、入れた順を覚えています。keys()、values()、entries() は入れた順に取り出せる。
// 配列にしたいときは [...map.keys()] のようにスプレッド構文を使う。

// 問20 { user, time } の配列から、ユーザーごとのいちばん大きい time の Map を返す（キーは最初に出てきた順）
//     例: lastSeen([{ user: "a", time: 5 }, { user: "a", time: 3 }]) → Map { "a" => 5 }
export function lastSeen() {}
