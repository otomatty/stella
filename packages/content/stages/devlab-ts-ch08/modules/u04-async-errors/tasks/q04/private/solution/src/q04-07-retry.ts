// 問7 成功するまで、全部で attempts 回まで task を呼ぶ。attempts 回とも失敗したら、最後の失敗を投げる
//     例: retry(2回失敗する task, 3) → 3回目の値で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export async function retry(task: Task, attempts: number): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
