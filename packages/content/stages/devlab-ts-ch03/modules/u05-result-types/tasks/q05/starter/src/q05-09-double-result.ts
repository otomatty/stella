// 問9 成功なら value を2倍にした成功、失敗ならそのまま返す
//     例: doubleResult({ ok: true, value: 4 }) → { ok: true, value: 8 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function doubleResult() {}
