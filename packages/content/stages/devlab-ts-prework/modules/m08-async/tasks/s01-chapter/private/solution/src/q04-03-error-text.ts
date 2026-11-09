// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問3
export async function errorText(task: Task): Promise<string> {
  try {
    await task();
    return "OK";
  } catch (error) {
    return error instanceof Error ? error.message : "不明なエラー";
  }
}
