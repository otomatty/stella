// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問19
export async function finallyLog(task: Task, log: string[]): Promise<number> {
  log.push("開始");
  try {
    const value = await task();
    log.push("成功");
    return value;
  } catch (error) {
    log.push("失敗");
    throw error;
  } finally {
    log.push("終了");
  }
}
