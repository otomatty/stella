// 問18 tasks（Promise を返す関数の配列）を前から1つずつ呼び、前の task が終わってから次を呼ぶ。結果の配列を返す
//     例: runInOrder([a を返す task, b を返す task]) → ["a", "b"] で解決する
// async と await を使ってください。
// 戻り値の型は Promise<…> と明記してください。

export async function runInOrder(tasks: readonly (() => Promise<string>)[]): Promise<string[]> {
  const results: string[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
