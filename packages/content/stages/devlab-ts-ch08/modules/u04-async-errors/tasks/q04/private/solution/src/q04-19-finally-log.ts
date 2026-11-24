// 問19 log に "開始" を足してから task を待つ。成功なら "成功"、失敗なら "失敗" を足し、どちらでも最後に "終了" を足す。結果は task と同じ（失敗はそのまま投げる）
//     例: finallyLog(失敗する task, log) → 失敗し、log は ["開始", "失敗", "終了"]
// async と await を使ってください。
// 失敗は catch で扱い、「終了」は finally で足してください。

export type Task = () => Promise<number>;

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
