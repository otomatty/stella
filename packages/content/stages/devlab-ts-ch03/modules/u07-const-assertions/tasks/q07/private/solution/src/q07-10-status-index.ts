// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問10
export function statusIndex(status: Status): number {
  return STATUSES.indexOf(status);
}
