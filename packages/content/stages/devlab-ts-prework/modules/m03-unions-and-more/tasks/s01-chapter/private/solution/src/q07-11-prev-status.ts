// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問11
export function prevStatus(status: Status): Status {
  return STATUSES[STATUSES.indexOf(status) - 1] ?? status;
}
