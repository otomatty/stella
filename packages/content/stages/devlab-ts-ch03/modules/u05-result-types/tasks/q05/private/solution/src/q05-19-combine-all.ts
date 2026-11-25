// 問19 すべて成功なら value の合計の成功。失敗があれば最初の失敗を返す
//     例: combineAll([{ ok: true, value: 1 }, { ok: true, value: 2 }]) → { ok: true, value: 3 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function combineAll(results: readonly Result[]): Result {
  let total = 0;
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    total += result.value;
  }
  return { ok: true, value: total };
}
