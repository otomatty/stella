// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問2
export async function runOr(task: Task, fallback: number): Promise<number> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}
