// 問2 error を持つ失敗の Result を作る
//     例: failure("だめ") → { ok: false, error: "だめ" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function failure() {}
