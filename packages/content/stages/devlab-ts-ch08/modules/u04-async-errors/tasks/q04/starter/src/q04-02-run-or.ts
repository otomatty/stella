// 問2 task を待ち、成功ならその値、失敗なら fallback を返す
//     例: runOr(失敗する task, 0) → 0 で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export function runOr() {}
