// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問9
export async function firstSuccess(tasks: readonly Task[]): Promise<number> {
  for (const task of tasks) {
    try {
      return await task();
    } catch {
      // 次の task を試す
    }
  }
  throw new Error("すべて失敗しました");
}
