// 問18 retry と同じだが、失敗したときに shouldRetry(error) が false なら、やり直さずにその失敗をすぐ投げる
//     例: retryIf(task, 3, (error) => error instanceof TypeError) → TypeError のときだけやり直す
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export function retryIf() {}
