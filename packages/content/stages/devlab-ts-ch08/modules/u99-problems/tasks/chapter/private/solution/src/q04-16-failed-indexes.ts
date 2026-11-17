// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問16
export async function failedIndexes(tasks: readonly Task[]): Promise<number[]> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.flatMap((r, i) => (r.status === "rejected" ? [i] : []));
}
