// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問17
export async function retryWithDelay(task: Task, attempts: number, ms: number): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await wait(ms);
    }
    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
