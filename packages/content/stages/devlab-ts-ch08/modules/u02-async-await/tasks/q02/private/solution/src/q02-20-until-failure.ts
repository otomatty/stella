// 問20 tasks を前から順番に呼び、失敗したらそこで止めて、それまでに成功した結果の配列を返す（失敗は投げない）
//     例: untilFailure([a, 失敗する task, c]) → ["a"] で解決し、c は呼ばない
// async と await を使ってください。
// 戻り値の型は Promise<…> と明記してください。
// 失敗は try・catch で受け止めてください。

export async function untilFailure(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    try {
      results.push(await task());
    } catch {
      break;
    }
  }
  return results;
}
