// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters
//
// 「省略したら◯◯」と書いた引数は、times = 2 のようにデフォルト引数で書く。デフォルト値を書いた引数には型注釈を書かない（値から推論される。ESLint の no-inferrable-types）。
// それ以外の引数と戻り値には型注釈を付けること。

// 問10 end 未満の数を、start から step ずつ増やした配列を返す。引数は rangeOf(end, start, step) の順で、start を省略したら 0、step を省略したら 1
//     例: rangeOf(3) → [0, 1, 2]
//     例: rangeOf(10, 2, 3) → [2, 5, 8]
export function rangeOf() {}
