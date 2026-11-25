// 問19 ステータスの配列から、{ todo, doing, done } それぞれの数を数える
//     例: countByStatus(["todo", "done", "done"]) → { todo: 1, doing: 0, done: 2 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Status 型を使う。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

export function countByStatus() {}
