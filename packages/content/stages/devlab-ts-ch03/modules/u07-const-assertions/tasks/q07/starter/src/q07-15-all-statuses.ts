// 問15 STATUSES をコピーした、書き換えられる配列を返す
//     例: allStatuses() → ["todo", "doing", "done"]
// 戻り値に型注釈を付ける。
// 定義済みの STATUSES と Status を使う。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

export function allStatuses() {}
