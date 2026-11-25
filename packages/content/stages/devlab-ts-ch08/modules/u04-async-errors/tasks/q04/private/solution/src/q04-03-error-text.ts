// 問3 成功なら "OK"、Error で失敗したらその message、Error でないもので失敗したら "不明なエラー" を返す
//     例: errorText(Error("通信エラー") で失敗する task) → "通信エラー" で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。
// 失敗の理由は instanceof Error で確かめてから message を読んでください。

export type Task = () => Promise<number>;

export async function errorText(task: Task): Promise<string> {
  try {
    await task();
    return "OK";
  } catch (error) {
    return error instanceof Error ? error.message : "不明なエラー";
  }
}
