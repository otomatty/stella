// 問4 成功なら { ok: true, value }、失敗なら { ok: false, message } を返す（Result）。Error でなければ message は "不明なエラー"
//     例: toResult(5 で成功する task) → { ok: true, value: 5 } で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。
// 失敗の理由は instanceof Error で確かめてから message を読んでください。

export type Task = () => Promise<number>;

export type Result = { ok: true; value: number } | { ok: false; message: string };

export async function toResult(task: Task): Promise<Result> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "不明なエラー" };
  }
}
