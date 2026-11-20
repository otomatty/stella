// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問18
export async function retryIf(
  task: Task,
  attempts: number,
  shouldRetry: (error: unknown) => boolean,
): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}
