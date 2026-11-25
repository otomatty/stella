// 問20 tasks をすべて同時に呼び、{ values: 成功した値の配列, errors: 失敗の message の配列 } を返す（どちらも元の順。Error でなければ "不明なエラー"）
//     例: settleAll([1 で成功, Error("x") で失敗]) → { values: [1], errors: ["x"] } で解決する
// async と await を使ってください。
// 失敗の理由は instanceof Error で確かめてから message を読んでください。
// 失敗と成功の判定には Promise.allSettled を使ってください。

export type Task = () => Promise<number>;

export function settleAll() {}
