// 問10 tasks をすべて同時に呼び（Promise.allSettled）、失敗した数を返す
//     例: countFailures([成功, 失敗, 失敗]) → 2 で解決する
// async と await を使ってください。

export type Task = () => Promise<number>;

export async function countFailures(tasks: readonly Task[]): Promise<number> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.filter((r) => r.status === "rejected").length;
}
