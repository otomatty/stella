// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 成功と失敗を表す型 Result は定義済みです。引数と戻り値には型注釈を付けること。
// 失敗を例外ではなく値で返すと、呼び出す側は result.ok で場合を分けてから value や error を使うことになる。
// 失敗のときの error の文言は、問題文に書いたとおりにする。

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問19 すべて成功なら value の合計の成功。失敗があれば最初の失敗を返す
//     例: combineAll([{ ok: true, value: 1 }, { ok: true, value: 2 }]) → { ok: true, value: 3 }
export function combineAll() {}
