// 問4 成功なら value、失敗なら fallback を返す
//     例: valueOr({ ok: false, error: "x" }, 0) → 0
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function valueOr() {}
