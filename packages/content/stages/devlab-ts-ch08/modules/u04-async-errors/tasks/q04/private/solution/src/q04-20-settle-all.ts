// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

// 問20
export async function settleAll(
  tasks: readonly Task[],
): Promise<{ values: number[]; errors: string[] }> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  const values: number[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    } else {
      const reason: unknown = result.reason;
      errors.push(reason instanceof Error ? reason.message : "不明なエラー");
    }
  }
  return { values, errors };
}
