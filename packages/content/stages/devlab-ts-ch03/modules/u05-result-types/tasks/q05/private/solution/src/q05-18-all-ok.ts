// 問18 すべて成功なら true。空の配列も true
//     例: allOk([成功, 失敗]) → false
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function allOk(results: readonly Result[]): boolean {
  return results.every((result) => result.ok);
}
