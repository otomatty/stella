// 問13 成功の value だけを合計する
//     例: sumOk([{ ok: true, value: 1 }, 失敗, { ok: true, value: 2 }]) → 3
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function sumOk(results: readonly Result[]): number {
  let total = 0;
  for (const result of results) {
    if (result.ok) {
      total += result.value;
    }
  }
  return total;
}
