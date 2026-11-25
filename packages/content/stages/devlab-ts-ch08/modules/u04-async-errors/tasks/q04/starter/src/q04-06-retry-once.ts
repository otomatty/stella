// 問6 task を呼び、失敗したら1回だけやり直す。やり直しも失敗したら、その失敗を投げる
//     例: retryOnce(1回目だけ失敗する task) → 2回目の値で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export function retryOnce() {}
