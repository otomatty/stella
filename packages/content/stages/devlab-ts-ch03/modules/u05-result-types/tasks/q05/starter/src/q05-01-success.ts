// 問1 value を持つ成功の Result を作る
//     例: success(3) → { ok: true, value: 3 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function success() {}
