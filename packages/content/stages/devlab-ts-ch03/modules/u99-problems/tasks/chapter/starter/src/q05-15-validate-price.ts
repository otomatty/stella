// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 成功と失敗を表す型 Result は定義済みです。引数と戻り値には型注釈を付けること。
// 失敗を例外ではなく値で返すと、呼び出す側は result.ok で場合を分けてから value や error を使うことになる。
// 失敗のときの error の文言は、問題文に書いたとおりにする。

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問15 価格を確かめる。負なら「価格は0以上にしてください」、整数でなければ「価格は整数にしてください」の失敗。問題なければその価格の成功
//     例: validatePrice(-1) → { ok: false, error: "価格は0以上にしてください" }
export function validatePrice() {}
