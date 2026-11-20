// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問5
export async function withContext(task: Task, context: string): Promise<number> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    throw new Error(`${context}: ${message}`, { cause: error });
  }
}
