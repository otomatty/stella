// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception

export type Task = () => Promise<number>;

export type Result = { ok: true; value: number } | { ok: false; message: string };

// 問4
export async function toResult(task: Task): Promise<Result> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "不明なエラー" };
  }
}
