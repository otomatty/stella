// 問7 平方根を返す。負の数なら、error が「負の数です」の失敗
//     例: safeSqrt(9) → { ok: true, value: 3 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function safeSqrt() {}
