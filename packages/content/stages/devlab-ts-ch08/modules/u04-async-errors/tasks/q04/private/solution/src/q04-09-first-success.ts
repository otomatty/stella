// 問9 tasks を前から順番に試し、最初に成功した値を返す（成功したら後ろは呼ばない）。全部失敗したら "すべて失敗しました" の Error
//     例: firstSuccess([失敗する task, 7 で成功する task]) → 7 で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

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
