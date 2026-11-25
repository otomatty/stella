// 問11 成功の数を返す
//     例: countOk([成功, 失敗, 成功]) → 2
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function countOk(results: readonly Result[]): number {
  return results.filter((result) => result.ok).length;
}
