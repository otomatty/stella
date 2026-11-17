// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問6
export async function retryOnce(task: Task): Promise<number> {
  try {
    return await task();
  } catch {
    return await task();
  }
}
