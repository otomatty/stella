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

// 問12
export async function withTimeout(task: Task, ms: number): Promise<number> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウトしました"));
    }, ms);
  });
  return await Promise.race([task(), timer]);
}
