// 問5 失敗したら `${context}: ${元の message}` の Error を投げ直す。元の失敗は { cause: error } で新しい Error に持たせる
//     例: withContext(Error("x") で失敗する task, "保存") → Error("保存: x") で失敗する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。
// 失敗の理由は instanceof Error で確かめてから message を読んでください。

export type Task = () => Promise<number>;

export async function withContext(task: Task, context: string): Promise<number> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    throw new Error(`${context}: ${message}`, { cause: error });
  }
}
