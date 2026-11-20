// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問1
export async function safeRun(task: Task): Promise<number | undefined> {
  try {
    return await task();
  } catch {
    return undefined;
  }
}
