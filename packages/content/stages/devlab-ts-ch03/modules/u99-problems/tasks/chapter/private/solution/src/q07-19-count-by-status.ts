// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問19
export function countByStatus(statuses: readonly Status[]): {
  todo: number;
  doing: number;
  done: number;
} {
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const status of statuses) {
    counts[status]++;
  }
  return counts;
}
