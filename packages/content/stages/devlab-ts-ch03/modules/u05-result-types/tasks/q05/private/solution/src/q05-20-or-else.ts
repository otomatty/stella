// 問20 first が成功なら first、失敗なら second を返す
//     例: orElse(失敗, { ok: true, value: 2 }) → { ok: true, value: 2 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function orElse(first: Result, second: Result): Result {
  return first.ok ? first : second;
}
