// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問16
export const STATUS_TEXT = { todo: "未着手", doing: "作業中", done: "完了" } as const;

export function statusText(status: Status) {
  return STATUS_TEXT[status];
}
