// 問1 task を待ち、成功ならその値、失敗なら undefined を返す
//     例: safeRun(失敗する task) → undefined で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export async function safeRun(task: Task): Promise<number | undefined> {
  try {
    return await task();
  } catch {
    return undefined;
  }
}
