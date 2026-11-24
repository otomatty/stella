// 問5 失敗なら error、成功なら fallback を返す
//     例: errorOr({ ok: false, error: "x" }, "なし") → "x"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function errorOr(result: Result, fallback: string): string {
  return result.ok ? fallback : result.error;
}
