// 問8 成功するまで、全部で max 回まで task を呼び、成功までに呼んだ回数を返す。max 回とも失敗したら、最後の失敗を投げる
//     例: attemptsNeeded(2回失敗する task, 5) → 3 で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

export function attemptsNeeded() {}
