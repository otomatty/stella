// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問15
export async function logErrors(tasks: readonly Task[], log: string[]): Promise<number[]> {
  const values: number[] = [];
  for (const task of tasks) {
    try {
      values.push(await task());
    } catch (error) {
      log.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return values;
}
