export const STATUSES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export function nextStatus(status: Status): Status {
  const index = STATUSES.indexOf(status);
  return STATUSES[index + 1] ?? status;
}

export const STATUS_LABELS = {
  todo: "未着手",
  doing: "作業中",
  done: "完了",
} as const;

// 戻り値は "未着手" | "作業中" | "完了" に推論される。as const がないと string になる
export function labelOf(status: Status) {
  return STATUS_LABELS[status];
}
