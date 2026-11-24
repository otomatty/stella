// 問16 tasks をすべて同時に呼び、失敗した task の位置（0 から数える）の配列を返す
//     例: failedIndexes([成功, 失敗, 成功, 失敗]) → [1, 3] で解決する
// async と await を使ってください。
// 失敗と成功の判定には Promise.allSettled を使ってください。

export type Task = () => Promise<number>;

export async function failedIndexes(tasks: readonly Task[]): Promise<number[]> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.flatMap((r, i) => (r.status === "rejected" ? [i] : []));
}
