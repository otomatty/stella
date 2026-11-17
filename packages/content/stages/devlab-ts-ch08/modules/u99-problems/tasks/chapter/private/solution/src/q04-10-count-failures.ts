// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問10
export async function countFailures(tasks: readonly Task[]): Promise<number> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.filter((r) => r.status === "rejected").length;
}
