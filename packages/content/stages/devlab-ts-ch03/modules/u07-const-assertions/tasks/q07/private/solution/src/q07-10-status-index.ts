// 問10 STATUSES の何番目（0から数える）かを返す
//     例: statusIndex("done") → 2
// 引数と戻り値に型注釈を付ける。
// 定義済みの STATUSES と Status を使う。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

export function statusIndex(status: Status): number {
  return STATUSES.indexOf(status);
}
