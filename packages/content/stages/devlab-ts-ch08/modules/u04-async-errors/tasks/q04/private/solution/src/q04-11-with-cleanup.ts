// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問11
export async function withCleanup(task: Task, cleanup: () => void): Promise<number> {
  try {
    return await task();
  } finally {
    cleanup();
  }
}
