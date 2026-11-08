// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問8
export async function attemptsNeeded(task: Task, max: number): Promise<number> {
  let lastError: unknown = new Error("max は1以上にしてください");
  for (let i = 1; i <= max; i++) {
    try {
      await task();
      return i;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
