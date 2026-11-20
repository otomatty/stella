// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters
//
// 「省略したら◯◯」と書いた引数は、times = 2 のようにデフォルト引数で書く。デフォルト値を書いた引数には型注釈を書かない（値から推論される。ESLint の no-inferrable-types）。
// それ以外の引数と戻り値には型注釈を付けること。

// 問9 税込価格（1円未満は切り捨て）を返す。rate を省略したら 0.1
//     例: withTax(1000) → 1100
export function withTax() {}
