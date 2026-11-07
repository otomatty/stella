// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 成功と失敗を表す型 Result は定義済みです。引数と戻り値には型注釈を付けること。
// 失敗を例外ではなく値で返すと、呼び出す側は result.ok で場合を分けてから value や error を使うことになる。
// 失敗のときの error の文言は、問題文に書いたとおりにする。

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問5 失敗なら error、成功なら fallback を返す
//     例: errorOr({ ok: false, error: "x" }, "なし") → "x"
export function errorOr() {}
