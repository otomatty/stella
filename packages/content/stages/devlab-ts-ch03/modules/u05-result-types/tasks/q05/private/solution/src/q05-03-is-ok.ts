// 問3 成功なら true
//     例: isOk({ ok: true, value: 1 }) → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function isOk(result: Result): boolean {
  return result.ok;
}
