// 問12 最初に見つかった失敗の error を返す。失敗がなければ undefined
//     例: firstError([成功, { ok: false, error: "x" }]) → "x"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function firstError() {}
