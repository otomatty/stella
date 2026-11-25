// 問11 task の結果を返す。成功しても失敗しても、最後に cleanup() を呼ぶ（finally）
//     例: withCleanup(task, cleanup) → task の結果。cleanup は必ず1回呼ばれる
// async と await を使ってください。

export type Task = () => Promise<number>;

export async function withCleanup(task: Task, cleanup: () => void): Promise<number> {
  try {
    return await task();
  } finally {
    cleanup();
  }
}
