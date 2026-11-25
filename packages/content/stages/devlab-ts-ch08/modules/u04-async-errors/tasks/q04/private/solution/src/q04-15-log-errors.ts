// 問15 tasks を前から順番に呼ぶ。失敗したら message（Error でなければ "不明なエラー"）を log に足して続ける。成功した値の配列を返す
//     例: logErrors([1 で成功, Error("x") で失敗, 3 で成功], log) → [1, 3] で解決し、log は ["x"]
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。
// 失敗の理由は instanceof Error で確かめてから message を読んでください。

export type Task = () => Promise<number>;

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
